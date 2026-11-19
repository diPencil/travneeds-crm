import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { emailStatuses } from '../../../../shared/emails/email.contracts.js';
import { requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { emailQuotation, listEmails } from './emails.service.js';
const limiter = rateLimit({
  windowMs: 60000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
export const emailsRouter = Router();
emailsRouter.use(requireSession);
emailsRouter.get('/', async (request, response) => {
  const query = z
    .object({
      search: z.string().trim().max(120).default(''),
      status: z.enum(emailStatuses).optional(),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .strict()
    .parse(request.query);
  response.json(await listEmails(response.locals.session.user, query));
});
emailsRouter.post('/quotation/:id', requireCsrf, limiter, async (request, response) => {
  const id = z
    .string()
    .regex(/^[1-9]\d{0,18}$/)
    .parse(request.params.id);
  const input = z
    .object({
      shareId: z.uuid(),
      token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      locale: z.enum(['en', 'ar']),
      attachPdf: z.boolean(),
      requestKey: z.uuid(),
    })
    .strict()
    .parse(request.body);
  const result = await emailQuotation(response.locals.session.user, id, input);
  response.status(result.status === 'sent' ? 201 : 200).json(result);
});
