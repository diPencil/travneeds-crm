import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { HttpError } from '../../http/errors.js';
import { requireCsrf, requireSession, requestToken, sessionCookie } from './auth.middleware.js';
import { sessionCookieOptions } from './auth.routes.js';
import { finishGoogleLogin, googleLoginStatus, startGoogleLogin } from './google-login.service.js';

const browserCookie = env.NODE_ENV === 'production' ? '__Host-travneeds_oauth' : 'travneeds_oauth';
const settings = { ...sessionCookieOptions, sameSite: 'lax' as const };
const limiter = rateLimit({
  windowMs: 600000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
export const googleLoginRouter = Router();
googleLoginRouter.get('/availability', async (_request, response) =>
  response.json(await googleLoginStatus()),
);
googleLoginRouter.get('/link', requireSession, async (_request, response) =>
  response.json(await googleLoginStatus(response.locals.session.user.id)),
);
googleLoginRouter.post('/start', limiter, async (_request, response) => {
  const flow = await startGoogleLogin();
  response
    .cookie(browserCookie, flow.browser, { ...settings, maxAge: 600000 })
    .json({ url: flow.url });
});
googleLoginRouter.post('/link', limiter, requireSession, requireCsrf, async (request, response) => {
  const token = requestToken(request);
  if (!token) throw new HttpError(401, 'UNAUTHENTICATED');
  const flow = await startGoogleLogin({
    userId: response.locals.session.user.id,
    sessionToken: token,
  });
  response
    .cookie(browserCookie, flow.browser, { ...settings, maxAge: 600000 })
    .json({ url: flow.url });
});
googleLoginRouter.get('/callback', limiter, async (request, response) => {
  response.set('Referrer-Policy', 'no-referrer').clearCookie(browserCookie, settings);
  const query = z
    .object({ state: z.string().length(43), code: z.string().min(1).max(4096) })
    .safeParse(request.query);
  const browser = request.headers.cookie
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${browserCookie}=`))
    ?.slice(browserCookie.length + 1);
  if (!query.success || !browser) {
    response.redirect(303, '/login?google=unavailable');
    return;
  }
  try {
    const result = await finishGoogleLogin(browser, query.data.state, query.data.code, {
      requestIp: request.ip,
      userAgent: request.get('User-Agent'),
    });
    if (result.linked) {
      response.redirect(303, '/?google=linked');
      return;
    }
    response
      .cookie(sessionCookie, result.token, { ...sessionCookieOptions, maxAge: 8 * 60 * 60 * 1000 })
      .redirect(303, '/');
  } catch (error) {
    const code =
      error instanceof HttpError && error.code === 'GOOGLE_ACCOUNT_NOT_LINKED'
        ? 'not-linked'
        : 'unavailable';
    response.redirect(303, `/login?google=${code}`);
  }
});
