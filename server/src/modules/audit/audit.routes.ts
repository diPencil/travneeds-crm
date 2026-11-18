import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { pool } from '../../database/pool.js';
import { requireSession } from '../auth/auth.middleware.js';

export const auditRouter = Router();
auditRouter.get('/mine', requireSession, async (_request, response) => {
  const session = response.locals.session as AuthSession;
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT CAST(id AS CHAR) AS id, action, created_at AS createdAt FROM audit_events WHERE actor_id = ? ORDER BY id DESC LIMIT 50',
    [session.user.id],
  );
  response.json({ events: rows });
});
