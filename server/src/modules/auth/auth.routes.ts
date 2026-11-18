import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { env } from '../../config/env.js';
import { login, logout } from './auth.service.js';
import { requestToken, requireCsrf, requireSession, sessionCookie } from './auth.middleware.js';

export const authRouter = Router();
const credentials = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

authRouter.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_ATTEMPTS' } },
  }),
  async (request, response) => {
    const input = credentials.parse(request.body);
    const result = await login(input.email, input.password);
    response.cookie(sessionCookie, result.token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
    response.json({ user: result.user, csrfToken: result.csrfToken });
  },
);

authRouter.get('/session', requireSession, (_request, response) => {
  response.json(response.locals.session as AuthSession);
});

authRouter.post('/logout', requireSession, requireCsrf, async (request, response) => {
  const session = response.locals.session as AuthSession;
  await logout(requestToken(request)!, session.user.id);
  response.clearCookie(sessionCookie, cookieOptions).status(204).end();
});
