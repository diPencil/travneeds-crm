import { timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../http/errors.js';
import { readSession } from './auth.service.js';

export const sessionCookie =
  env.NODE_ENV === 'production' ? '__Host-travneeds_session' : 'travneeds_session';

export function requestToken(request: Request): string | undefined {
  return request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
}

export const requireSession: RequestHandler = async (request, response, next) => {
  const session = await readSession(requestToken(request));
  if (!session) throw new HttpError(401, 'UNAUTHENTICATED');
  response.locals.session = session;
  next();
};

export const requireAdmin: RequestHandler = (_request, response, next) => {
  const session = response.locals.session as AuthSession;
  if (!session.user.roles.includes('admin')) throw new HttpError(403, 'FORBIDDEN');
  next();
};

export const checkOrigin: RequestHandler = (request, _response, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    request.get('Origin') !== env.APP_ORIGIN
  ) {
    throw new HttpError(403, 'INVALID_ORIGIN');
  }
  next();
};

export const requireCsrf: RequestHandler = (request, response, next) => {
  const session = response.locals.session as AuthSession;
  const supplied = request.get('X-CSRF-Token') ?? '';
  if (
    !/^[a-f0-9]{64}$/.test(supplied) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(session.csrfToken))
  ) {
    throw new HttpError(403, 'INVALID_CSRF');
  }
  next();
};
