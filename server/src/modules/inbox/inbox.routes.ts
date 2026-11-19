import { timingSafeEqual } from 'node:crypto';
import { Router, raw } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { inboxChannels } from '../../../../shared/inbox/inbox.contracts.js';
import { requireAdmin, requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { readIntegrationCredentials } from '../settings/integrations.service.js';
import { listThreads, readMessages, readStaffThread, staffThread } from './inbox.repository.js';
import {
  guestHistory,
  guestMessage,
  linkInboxCustomer,
  receiveMeta,
  setThreadState,
  staffReply,
} from './inbox.service.js';
import { metaChannels, normalizeMetaWebhook, verifyMetaSignature } from './meta-messaging.js';

const numericId = z.string().regex(/^[1-9]\d{0,18}$/);
const queryHistory = z.object({ before: numericId.optional() }).strict();
const messageInput = z
  .object({ body: z.string().trim().min(1).max(4000), requestKey: z.uuid() })
  .strict();
const state = z.enum(['open', 'closed']);
const limiter = (limit: number) =>
  rateLimit({ windowMs: 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false });
export const inboxRouter = Router();
inboxRouter.use(requireSession);
inboxRouter.get('/', async (request, response) => {
  const query = z
    .object({
      search: z.string().trim().max(120).default(''),
      channel: z.enum(inboxChannels).optional(),
      status: state.optional(),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .strict()
    .parse(request.query);
  response.json(await listThreads(response.locals.session.user, query));
});
inboxRouter.get('/:id', async (request, response) => {
  const id = z.uuid().parse(request.params.id);
  response.json(await readStaffThread(response.locals.session.user, id));
});
inboxRouter.get('/:id/messages', async (request, response) => {
  const id = z.uuid().parse(request.params.id);
  const { before } = queryHistory.parse(request.query);
  await staffThread(pool, response.locals.session.user, id);
  response.json(await readMessages(pool, id, before));
});
inboxRouter.patch('/:id', requireCsrf, async (request, response) => {
  const input = z
    .object({ status: state.optional(), readThrough: numericId.optional() })
    .strict()
    .refine((value) => value.status || value.readThrough)
    .parse(request.body);
  await setThreadState(response.locals.session.user, z.uuid().parse(request.params.id), input);
  response.status(204).end();
});
inboxRouter.patch('/:id/customer', requireAdmin, requireCsrf, async (request, response) => {
  const input = z
    .object({ customerId: numericId.nullable(), previousCustomerId: numericId.nullable() })
    .strict()
    .parse(request.body);
  await linkInboxCustomer(response.locals.session.user, z.uuid().parse(request.params.id), input);
  response.status(204).end();
});
inboxRouter.post('/:id/messages', requireCsrf, limiter(30), async (request, response) => {
  const input = messageInput.parse(request.body);
  response
    .status(201)
    .json(
      await staffReply(
        response.locals.session.user,
        z.uuid().parse(request.params.id),
        input.body,
        input.requestKey,
      ),
    );
});
export const publicInboxRouter = Router();
publicInboxRouter.use(limiter(45));
publicInboxRouter.get('/:id', async (request, response) => {
  response.json(
    await guestHistory(
      z.uuid().parse(request.params.id),
      request.get('X-Quotation-Token') ?? '',
      queryHistory.parse(request.query).before,
    ),
  );
});
publicInboxRouter.post('/:id', limiter(10), async (request, response) => {
  const input = messageInput.parse(request.body);
  response
    .status(201)
    .json(
      await guestMessage(
        z.uuid().parse(request.params.id),
        request.get('X-Quotation-Token') ?? '',
        input.body,
        input.requestKey,
      ),
    );
});

export const metaWebhookRouter = Router();
metaWebhookRouter.get('/:channel', limiter(60), async (request, response) => {
  const channel = metaChannels.parse(request.params.channel);
  const query = z
    .object({
      'hub.mode': z.literal('subscribe'),
      'hub.verify_token': z.string().min(1).max(4096),
      'hub.challenge': z.string().regex(/^\d{1,200}$/),
    })
    .parse(request.query);
  const config = await readIntegrationCredentials(channel);
  const expected = Buffer.from(config?.verifyToken ?? '');
  const actual = Buffer.from(query['hub.verify_token']);
  if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new HttpError(403, 'WEBHOOK_VERIFICATION_FAILED');
  response.type('text/plain').send(query['hub.challenge']);
});
metaWebhookRouter.post(
  '/:channel',
  raw({ type: 'application/json', limit: '512kb', inflate: false }),
  async (request, response) => {
    const channel = metaChannels.parse(request.params.channel);
    const config = await readIntegrationCredentials(channel);
    if (
      !config ||
      !Buffer.isBuffer(request.body) ||
      !verifyMetaSignature(request.body, request.get('X-Hub-Signature-256') ?? '', config.appSecret)
    )
      throw new HttpError(403, 'WEBHOOK_VERIFICATION_FAILED');
    let payload: unknown;
    try {
      payload = JSON.parse(request.body.toString('utf8'));
    } catch {
      throw new HttpError(400, 'INVALID_WEBHOOK_BODY');
    }
    const { messages, statuses } = normalizeMetaWebhook(
      channel,
      payload,
      config.accountId,
      config.businessAccountId,
    );
    await receiveMeta(channel, config.accountId, messages, statuses);
    response.status(200).end();
  },
);
