import { isCatalogueMedia } from '../catalogue/catalogue.service.js';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { HttpError } from '../../http/errors.js';
import { requireSession, requireCsrf } from '../auth/auth.middleware.js';
import {
  saveQuotationImage,
  readQuotationImage,
  quotationImageSizeLimit,
} from './quotation-media.service.js';
import { downloadQuotationImage } from './quotation-image-import.js';
export const quotationMediaRouter = Router();
quotationMediaRouter.use(requireSession);
quotationMediaRouter.post(
  '/',
  requireCsrf,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: quotationImageSizeLimit }),
  async (request, response) => {
    if (!Buffer.isBuffer(request.body)) throw new HttpError(400, 'INVALID_IMAGE');
    response
      .status(201)
      .json(await saveQuotationImage(request.body, response.locals.session.user.id));
  },
);
quotationMediaRouter.post(
  '/import',
  requireCsrf,
  rateLimit({
    windowMs: 60000,
    limit: 20,
    keyGenerator: (_request, response) => response.locals.session.user.id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'MEDIA_RATE_LIMIT' } },
  }),
  async (request, response) => {
    const { url } = z
      .object({ url: z.string().trim().max(2048).pipe(z.url()) })
      .strict()
      .parse(request.body);
    const image = await downloadQuotationImage(new URL(url));
    response.status(201).json(await saveQuotationImage(image, response.locals.session.user.id));
  },
);
quotationMediaRouter.get('/:id', async (request, response) => {
  const image = await readQuotationImage(z.uuid().parse(request.params.id));
  if (
    !response.locals.session.user.roles.includes('admin') &&
    image.created_by !== response.locals.session.user.id &&
    !(await isCatalogueMedia(request.params.id as string))
  )
    throw new HttpError(404, 'NOT_FOUND');
  response
    .set('Content-Type', image.mime_type)
    .set('Content-Disposition', 'inline')
    .send(image.content);
});
