import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { getPublicUser, type UserRow } from '../users/users.repository.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { writeAuditEvent } from '../audit/audit.repository.js';

export const tokenHash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
const unknownUserHash = hashPassword(randomBytes(32).toString('hex'));

type SignInClient = { requestIp?: string; userAgent?: string };

export async function login(
  email: string,
  password: string,
  client: SignInClient = {},
): Promise<AuthSession & { token: string }> {
  const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE email = ?', [
    email.toLowerCase(),
  ]);
  const user = rows[0];
  const validPassword = await verifyPassword(
    password,
    user?.password_hash ?? (await unknownUserHash),
  );
  const requestIp = client.requestIp && isIP(client.requestIp) ? client.requestIp : null;
  if (!user || user.status !== 'active' || !validPassword) {
    await writeAuditEvent(pool, {
      actorId: null,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user?.id ?? null,
      module: 'authentication',
      severity: 'warning',
      outcome: 'failure',
      requestIp,
      details: 'Sign-in rejected: invalid credentials or inactive account',
    });
    throw new HttpError(401, 'INVALID_CREDENTIALS');
  }

  return issueSession(user.id, client, 'Successful sign-in', async (connection) => {
    const [current] = await connection.execute<UserRow[]>(
      'SELECT password_hash, status FROM users WHERE id = ? FOR UPDATE',
      [user.id],
    );
    if (current[0]?.status !== 'active' || current[0].password_hash !== user.password_hash)
      throw new HttpError(401, 'INVALID_CREDENTIALS');
  });
}

export async function issueSession(
  userId: string,
  client: SignInClient,
  details: string,
  validate: (connection: PoolConnection) => Promise<void>,
): Promise<AuthSession & { token: string }> {
  const token = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  const requestIp = client.requestIp && isIP(client.requestIp) ? client.requestIp : null;
  await transaction(async (connection) => {
    await validate(connection);
    await connection.execute('DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP(6)');
    await connection.execute('UPDATE users SET last_login_at = UTC_TIMESTAMP(6) WHERE id = ?', [
      userId,
    ]);
    await connection.execute(
      'INSERT INTO auth_sessions (token_hash, csrf_token, user_id, expires_at, user_agent) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 8 HOUR), ?)',
      [
        tokenHash(token),
        csrfToken,
        userId,
        client.userAgent?.replace(/\p{Cc}/gu, ' ').slice(0, 512) ?? null,
      ],
    );
    await writeAuditEvent(connection, {
      actorId: userId,
      action: 'auth.login',
      entityType: 'user',
      entityId: userId,
      module: 'authentication',
      requestIp,
      details,
    });
  });
  const publicUser = await getPublicUser(userId);
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
