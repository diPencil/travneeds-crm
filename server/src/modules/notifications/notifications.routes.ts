import { Router } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { requireCsrf, requireSession } from '../auth/auth.middleware.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireSession);
notificationsRouter.get('/', async (_request, response) => {
  const { user } = response.locals.session as AuthSession;
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT CAST(id AS CHAR) AS id, type, sender_name AS user, message AS content, created_at AS createdAt, read_at IS NULL AS isUnread, href FROM notifications WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 100',
    [user.id],
  );
  const [counts] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND deleted_at IS NULL AND read_at IS NULL',
    [user.id],
  );
  response.json({
    notifications: rows.map((row) => ({
      ...row,
      isUnread: Boolean(row.isUnread),
      href: /^\/(?!\/)/.test(row.href ?? '') ? row.href : '/notifications',
    })),
    unreadCount: Number(counts[0].total),
  });
});
notificationsRouter.post('/read-all', requireCsrf, async (request, response) => {
  z.object({}).strict().parse(request.body);
  const { user } = response.locals.session as AuthSession;
  await pool.execute(
    'UPDATE notifications SET read_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND deleted_at IS NULL AND read_at IS NULL',
    [user.id],
  );
  response.status(204).end();
});
notificationsRouter.post('/:id/read', requireCsrf, async (request, response) => {
  const id = z
    .string()
    .regex(/^[1-9]\d{0,19}$/)
    .parse(request.params.id);
  z.object({}).strict().parse(request.body);
  const { user } = response.locals.session as AuthSession;
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(6)) WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, user.id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'NOT_FOUND');
  response.status(204).end();
});
notificationsRouter.delete('/:id', requireCsrf, async (request, response) => {
  const id = z
    .string()
    .regex(/^[1-9]\d{0,19}$/)
    .parse(request.params.id);
  const { user } = response.locals.session as AuthSession;
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE notifications SET deleted_at = UTC_TIMESTAMP(6) WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, user.id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'NOT_FOUND');
  response.status(204).end();
});
