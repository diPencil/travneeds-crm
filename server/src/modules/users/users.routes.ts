import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import {
  requireAdmin,
  requireCsrf,
  requireSession,
  requestToken,
} from '../auth/auth.middleware.js';
import { tokenHash } from '../auth/auth.service.js';
import { readUserDetails, revokeUserSessions, messageUser } from './user-details.service.js';
import { readSystemAudit, systemAuditQuery } from '../audit/system-audit.service.js';
import { HttpError } from '../../http/errors.js';
import {
  createUserInput,
  updateUserInput,
  inviteInput,
  uuidInput,
  invitationTokenInput,
  acceptInviteInput,
} from './users.validation.js';
import {
  createUser,
  listUsers,
  updateUser,
  createInvitation,
  readInvitation,
  acceptInvitation,
  recordUserEvent,
} from './users.service.js';

export const usersRouter = Router();
usersRouter.use(requireSession, requireAdmin);
usersRouter.get('/', async (_request, response) => {
  response.json(await listUsers());
});
usersRouter.get('/logs', async (request, response) => {
  response.json(await readSystemAudit(systemAuditQuery.parse(request.query)));
});
usersRouter.get('/logs/export', async (request, response) => {
  response.json(await readSystemAudit(systemAuditQuery.parse(request.query), true));
});
usersRouter.get('/invitations', async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, full_name AS fullName, email, role_code AS role, expires_at AS expiresAt, accepted_at AS acceptedAt, revoked_at AS revokedAt FROM user_invitations ORDER BY created_at DESC LIMIT 200',
  );
  response.json(rows);
});
usersRouter.get('/:id', async (request, response) => {
  response.json(
    await readUserDetails(uuidInput.parse(request.params.id), tokenHash(requestToken(request)!)),
  );
});
usersRouter.use(requireCsrf);
usersRouter.post('/', async (request, response) => {
  response
    .status(201)
    .json(
      await createUser(
        createUserInput.parse(request.body),
        (response.locals.session as AuthSession).user.id,
      ),
    );
});
usersRouter.patch('/:id', async (request, response) => {
  await updateUser(
    uuidInput.parse(request.params.id),
    updateUserInput.parse(request.body),
    (response.locals.session as AuthSession).user.id,
  );
  response.status(204).end();
});
usersRouter.post('/:id/revoke-sessions', async (request, response) => {
  const id = uuidInput.parse(request.params.id);
  const actor = (response.locals.session as AuthSession).user.id;
  const input = z
    .object({ keepCurrent: z.boolean().default(false) })
    .strict()
    .parse(request.body);
  await revokeUserSessions(id, actor, input.keepCurrent, tokenHash(requestToken(request)!));
  response.status(204).end();
});
usersRouter.post('/:id/message', async (request, response) => {
  const input = z
    .object({ message: z.string().trim().min(1).max(2000) })
    .strict()
    .parse(request.body);
  await messageUser(
    uuidInput.parse(request.params.id),
    (response.locals.session as AuthSession).user.id,
    input.message,
  );
  response.status(204).end();
});
usersRouter.post('/invitations', async (request, response) => {
  response
    .status(201)
    .json(
      await createInvitation(
        inviteInput.parse(request.body),
        (response.locals.session as AuthSession).user.id,
      ),
    );
});
usersRouter.delete('/invitations/:id', async (request, response) => {
  const id = uuidInput.parse(request.params.id);
  await transaction(async (connection) => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM user_invitations WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL FOR UPDATE',
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND');
    await connection.execute(
      'UPDATE user_invitations SET revoked_at = UTC_TIMESTAMP(6) WHERE id = ?',
      [id],
    );
    await recordUserEvent(
      connection,
      (response.locals.session as AuthSession).user.id,
      'users.invitation_revoked',
      id,
    );
  });
  response.status(204).end();
});

export const invitationsRouter = Router();
invitationsRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
invitationsRouter.get('/:token', async (request, response) => {
  response.json(await readInvitation(invitationTokenInput.parse(request.params.token)));
});
invitationsRouter.post('/:token/accept', async (request, response) => {
  await acceptInvitation(
    invitationTokenInput.parse(request.params.token),
    acceptInviteInput.parse(request.body).password,
  );
  response.status(204).end();
});
