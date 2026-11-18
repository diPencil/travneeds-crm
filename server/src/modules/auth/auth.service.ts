import { createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { getPublicUser, type UserRow } from '../users/users.repository.js';
import { hashPassword, verifyPassword } from './passwords.js';

export const tokenHash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
const unknownUserHash = hashPassword(randomBytes(32).toString('hex'));

export async function login(
  email: string,
  password: string,
): Promise<AuthSession & { token: string }> {
  const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE email = ?', [
    email.toLowerCase(),
  ]);
  const user = rows[0];
  const validPassword = await verifyPassword(
    password,
    user?.password_hash ?? (await unknownUserHash),
  );
  if (!user || user.status !== 'active' || !validPassword)
    throw new HttpError(401, 'INVALID_CREDENTIALS');

  const token = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  await transaction(async (connection) => {
    const [current] = await connection.execute<UserRow[]>(
      'SELECT password_hash, status FROM users WHERE id = ? FOR UPDATE',
      [user.id],
    );
    if (current[0]?.status !== 'active' || current[0].password_hash !== user.password_hash) {
      throw new HttpError(401, 'INVALID_CREDENTIALS');
    }
    await connection.execute('DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP(6)');
    await connection.execute(
      'INSERT INTO auth_sessions (token_hash, csrf_token, user_id, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 8 HOUR))',
      [tokenHash(token), csrfToken, user.id],
    );
    await connection.execute(
      "INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES (?, 'auth.login', 'user', ?)",
      [user.id, user.id],
    );
  });
  const publicUser = await getPublicUser(user.id);
  if (!publicUser) throw new HttpError(401, 'UNAUTHENTICATED');
  return { user: publicUser, csrfToken, token };
}

export async function readSession(token: string | undefined): Promise<AuthSession | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [sessions] = await pool.execute<
    (RowDataPacket & { user_id: string; csrf_token: string })[]
  >(
    'SELECT user_id, csrf_token FROM auth_sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP(6)',
    [tokenHash(token)],
  );
  const session = sessions[0];
  if (!session) return null;
  const user = await getPublicUser(session.user_id);
  return user ? { user, csrfToken: session.csrf_token } : null;
}

export async function logout(token: string, userId: string): Promise<void> {
  await transaction(async (connection) => {
    await connection.execute('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash(token)]);
    await connection.execute(
      "INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES (?, 'auth.logout', 'user', ?)",
      [userId, userId],
    );
  });
}
