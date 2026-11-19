import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { decodeHTML } from 'entities';
import { requireAdmin, requireSession, requireCsrf } from '../auth/auth.middleware.js';
import { readIntegration, readIntegrationCredentials } from '../settings/integrations.service.js';
import { sanitizeRichText } from '../../http/rich-text.js';
import { HttpError } from '../../http/errors.js';

const input = z
  .object({
    source: z.enum(['en', 'ar']),
    target: z.enum(['en', 'ar']),
    format: z.enum(['text', 'html']),
    texts: z
      .array(
        z
          .string()
          .min(1)
          .max(40000)
          .refine((value) => !/[\p{Surrogate}]/u.test(value)),
      )
      .min(1)
      .max(32),
  })
  .strict()
  .refine(
    (value) =>
      value.source !== value.target &&
      Buffer.byteLength(JSON.stringify(value.texts), 'utf8') <= 60000,
  );
export const translationRouter = Router();
translationRouter.use(requireSession);
translationRouter.get('/status', async (_request, response) => {
  const settings = await readIntegration('translation');
  response.set('Cache-Control', 'no-store').json({
    available:
      settings.enabled && settings.encryptionReady && settings.configurationStatus === 'configured',
  });
});
translationRouter.use(
  requireCsrf,
  rateLimit({
    windowMs: 60000,
    limit: 30,
    keyGenerator: (_request, response) => response.locals.session.user.id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
async function translate(value: z.infer<typeof input>) {
  const configuration = await readIntegrationCredentials('translation');
  const texts = value.format === 'html' ? value.texts.map(sanitizeRichText) : value.texts;
  let result: Response;
  try {
    result = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': configuration.apiKey.trim(),
      },
      body: JSON.stringify({
        q: texts,
        source: value.source,
        target: value.target,
        format: value.format,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HttpError(502, 'TRANSLATION_PROVIDER_UNAVAILABLE');
  }
  if (!result.ok) throw new HttpError(502, 'TRANSLATION_PROVIDER_FAILED');
  const parsed = z
    .object({
      data: z.object({
        translations: z.array(z.object({ translatedText: z.string().min(1) })).length(texts.length),
      }),
    })
    .safeParse(await result.json().catch(() => null));
  if (!parsed.success) throw new HttpError(502, 'TRANSLATION_PROVIDER_INVALID_RESPONSE');
  return {
    translations: parsed.data.data.translations.map((item) =>
      value.format === 'html'
        ? sanitizeRichText(item.translatedText)
        : decodeHTML(item.translatedText),
    ),
    provider: 'google-cloud',
  };
}

translationRouter.post('/check', requireAdmin, async (_request, response) => {
  await translate({ source: 'en', target: 'ar', format: 'text', texts: ['Hello'] });
  response.status(204).end();
});
translationRouter.post('/', async (request, response) => {
  response.json(await translate(input.parse(request.body)));
});
