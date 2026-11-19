import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { readIntegrationCredentials } from '../settings/integrations.service.js';
import { issueSession, tokenHash } from './auth.service.js';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  timeoutDuration: 5000,
});
const redirectUri = `${env.APP_ORIGIN}/api/auth/google/callback`;
const secret = () => randomBytes(32).toString('base64url');
const clientId = z
  .string()
  .max(180)
  .regex(/^[a-zA-Z0-9_.-]+\.apps\.googleusercontent\.com$/);
const identity = z.object({
  sub: z.string().regex(/^[!-~]{1,255}$/),
  email: z.email().max(254),
  email_verified: z.literal(true),
  nonce: z.string(),
});
interface Flow extends RowDataPacket {
  browser_digest: string;
  client_id: string;
  verifier: string;
  nonce: string;
  user_id: string | null;
  session_digest: string | null;
}
async function configuration() {
  const config = await readIntegrationCredentials('google');
  if (!clientId.safeParse(config.clientId).success)
    throw new HttpError(503, 'GOOGLE_CONFIG_INVALID');
  return config;
}
export async function googleLoginStatus(userId?: string) {
  let config;
  try {
    config = await configuration();
  } catch (error) {
    if (error instanceof HttpError && error.status === 503)
      return { available: false, linked: false };
    throw error;
  }
  if (!userId) return { available: true, linked: false };
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT user_id FROM google_staff_identities WHERE user_id=? AND client_id=?',
    [userId, config.clientId],
  );
  return { available: true, linked: Boolean(rows[0]) };
}
export async function startGoogleLogin(link?: { userId: string; sessionToken: string }) {
  const config = await configuration();
  const state = secret();
  const browser = secret();
  const verifier = secret();
  const nonce = secret();
  await transaction(async (connection) => {
    await connection.execute('DELETE FROM google_oauth_flows WHERE expires_at<=UTC_TIMESTAMP(6)');
    await connection.execute(
      `INSERT INTO google_oauth_flows
      (state_digest,browser_digest,verifier,nonce,client_id,user_id,session_digest,expires_at)
      VALUES (?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 10 MINUTE))`,
      [
        tokenHash(state),
        tokenHash(browser),
        verifier,
        nonce,
        config.clientId,
        link?.userId ?? null,
        link ? tokenHash(link.sessionToken) : null,
      ],
    );
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email',
    state,
    nonce,
    code_challenge_method: 'S256',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    prompt: 'select_account',
  }).toString();
  return { url: url.href, browser };
}
export async function finishGoogleLogin(
  browser: string,
  state: string,
  code: string,
  client: { requestIp?: string; userAgent?: string },
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(browser) || !/^[A-Za-z0-9_-]{43}$/.test(state))
    throw new HttpError(401, 'GOOGLE_FLOW_INVALID');
  const digest = tokenHash(state);
  const flow = await transaction(async (connection) => {
    const [rows] = await connection.execute<Flow[]>(
      'SELECT * FROM google_oauth_flows WHERE state_digest=? AND expires_at>UTC_TIMESTAMP(6) FOR UPDATE',
      [digest],
    );
    const current = rows[0];
    if (
      !current ||
      !timingSafeEqual(Buffer.from(current.browser_digest), Buffer.from(tokenHash(browser)))
    )
      throw new HttpError(401, 'GOOGLE_FLOW_INVALID');
    await connection.execute('DELETE FROM google_oauth_flows WHERE state_digest=?', [digest]);
    return current;
  });
  const config = await configuration();
  if (config.clientId !== flow.client_id) throw new HttpError(401, 'GOOGLE_FLOW_INVALID');
  const result = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: flow.verifier,
    }),
  });
  if (!result.ok) throw new HttpError(401, 'GOOGLE_TOKEN_REJECTED');
  const { id_token } = z.object({ id_token: z.string().max(8192) }).parse(await result.json());
  const verified = await jwtVerify(id_token, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.clientId,
    algorithms: ['RS256'],
    maxTokenAge: '10m',
    requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
  });
  const claims = identity.parse(verified.payload);
  if (
    claims.nonce !== flow.nonce ||
    (verified.payload.azp && verified.payload.azp !== config.clientId)
  )
    throw new HttpError(401, 'GOOGLE_FLOW_INVALID');
  if (flow.user_id) {
    await transaction(async (connection) => {
      const [users] = await connection.execute<RowDataPacket[]>(
        "SELECT id,email FROM users WHERE id=? AND status='active' FOR UPDATE",
        [flow.user_id],
      );
      if (!users[0] || users[0].email.toLowerCase() !== claims.email.toLowerCase())
        throw new HttpError(403, 'GOOGLE_EMAIL_MISMATCH');
      const [sessions] = await connection.execute<RowDataPacket[]>(
        'SELECT user_id FROM auth_sessions WHERE token_hash=? AND user_id=? AND expires_at>UTC_TIMESTAMP(6) FOR UPDATE',
        [flow.session_digest, flow.user_id],
      );
      if (!sessions[0]) throw new HttpError(401, 'GOOGLE_FLOW_INVALID');
      const [bindings] = await connection.execute<RowDataPacket[]>(
        'SELECT client_id,subject FROM google_staff_identities WHERE user_id=? FOR UPDATE',
        [flow.user_id],
      );
      if (bindings[0]?.client_id === config.clientId && bindings[0].subject !== claims.sub)
        throw new HttpError(409, 'GOOGLE_ALREADY_LINKED');
      if (bindings[0])
        await connection.execute('DELETE FROM google_staff_identities WHERE user_id=?', [
          flow.user_id,
        ]);
      await connection.execute(
        'INSERT INTO google_staff_identities (user_id,client_id,subject) VALUES (?,?,?)',
        [flow.user_id, config.clientId, claims.sub],
      );
      await writeAuditEvent(connection, {
        actorId: flow.user_id,
        action: 'auth.google_linked',
        entityType: 'user',
        entityId: flow.user_id,
        module: 'authentication',
      });
    });
    return { linked: true as const };
  }
  const [matches] = await pool.execute<RowDataPacket[]>(
    'SELECT user_id FROM google_staff_identities WHERE client_id=? AND subject=?',
    [config.clientId, claims.sub],
  );
  const userId = matches[0]?.user_id as string | undefined;
  if (!userId) throw new HttpError(401, 'GOOGLE_ACCOUNT_NOT_LINKED');
  const session = await issueSession(
    userId,
    client,
    'Successful Google sign-in',
    async (connection) => {
      const [active] = await connection.execute<RowDataPacket[]>(
        "SELECT id,email FROM users WHERE id=? AND status='active' FOR UPDATE",
        [userId],
      );
      if (!active[0] || active[0].email.toLowerCase() !== claims.email.toLowerCase())
        throw new HttpError(401, 'GOOGLE_ACCOUNT_NOT_LINKED');
      const [bound] = await connection.execute<RowDataPacket[]>(
        'SELECT user_id FROM google_staff_identities WHERE user_id=? AND client_id=? AND subject=? FOR UPDATE',
        [userId, config.clientId, claims.sub],
      );
      if (!bound[0]) throw new HttpError(401, 'GOOGLE_ACCOUNT_NOT_LINKED');
    },
  );
  return { linked: false as const, token: session.token };
}
