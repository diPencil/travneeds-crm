import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { getPublicUser } from '../users/users.repository.js';

export const profileInput = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(30),
    avatarGender: z.enum(['male', 'female']),
    version: z.number().int().nonnegative(),
  })
  .strict();

export const accountRouter = Router();
accountRouter.patch('/profile', requireSession, requireCsrf, async (request, response) => {
  const input = profileInput.parse(request.body);
  const { user } = response.locals.session as AuthSession;
  try {
    await transaction(async (connection) => {
      await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);
      const [profiles] = await connection.execute<RowDataPacket[]>(
        'SELECT version FROM user_profiles WHERE user_id = ?',
        [user.id],
      );
      const version = Number(profiles[0]?.version ?? 0);
      if (version !== input.version) throw new HttpError(409, 'PROFILE_CONFLICT');
      await connection.execute(
        'UPDATE users SET full_name = ?, email = ?, version = version + 1 WHERE id = ?',
        [input.fullName, input.email.toLowerCase(), user.id],
      );
      if (profiles[0]) {
        await connection.execute(
          'UPDATE user_profiles SET phone = ?, avatar_gender = ?, version = version + 1 WHERE user_id = ?',
          [input.phone || null, input.avatarGender, user.id],
        );
      } else {
        await connection.execute(
          'INSERT INTO user_profiles (user_id, phone, avatar_gender) VALUES (?, ?, ?)',
          [user.id, input.phone || null, input.avatarGender],
        );
      }
      await connection.execute(
        "INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES (?, 'account.profile_updated', 'user', ?)",
        [user.id, user.id],
      );
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'EMAIL_IN_USE');
    }
    throw error;
  }
  response.json(await getPublicUser(user.id));
});
