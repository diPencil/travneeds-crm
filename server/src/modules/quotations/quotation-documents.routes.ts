import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import type { QuotationDocument } from '../../../../shared/quotations/quotation.contracts.js';
import { quotationContentInput } from '../../../../shared/quotations/quotation.validation.js';
import { calculateQuotation } from '../../../../shared/quotations/quotation-pricing.js';
import { pool } from '../../database/pool.js';
import type { RowDataPacket } from 'mysql2/promise';
import { requireCsrf } from '../auth/auth.middleware.js';
import { sanitizeQuotationContent, validateQuotationMedia } from './quotation-content.js';
import { readQuotation } from './quotations.repository.js';
import { renderQuotationHtml, renderQuotationPdf } from './quotation-documents.service.js';
import {
  createQuotationShare,
  readPublicQuotation,
  listQuotationShares,
  revokeQuotationShare,
} from './quotation-shares.service.js';

const idInput = z.string().regex(/^[1-9]\d{0,18}$/);
const localeInput = z.enum(['en', 'ar']).default('en');
const pdfLimit = rateLimit({
  windowMs: 60000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
export const quotationDocumentsRouter = Router();

quotationDocumentsRouter.post('/preview', requireCsrf, pdfLimit, async (request, response) => {
  const input = z
    .object({ content: quotationContentInput, locale: localeInput })
    .strict()
    .parse(request.body);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT project_name AS projectName,logo_url AS logoUrl,primary_color AS primaryColor FROM project_settings WHERE id=1',
  );
  const content = sanitizeQuotationContent(input.content);
  await validateQuotationMedia(pool, content, response.locals.session.user);
  let price: QuotationDocument['price'] = null;
  try {
    price = calculateQuotation(content);
  } catch {
    /* A draft preview accurately shows unavailable pricing. */
  }
  const document: QuotationDocument = {
    id: '',
    reference: '',
    customerId: null,
    customerName: null,
    title: content.title,
    type: content.type,
    status: 'draft',
    currency: content.pricing.currency,
    total: price?.total ?? null,
    version: 0,
    validUntil: content.validUntil || null,
    createdAt: '',
    updatedAt: '',
    createdBy: response.locals.session.user.id,
    content,
    price,
    branding: {
      projectName: rows[0].projectName,
      logoUrl: rows[0].logoUrl,
      primaryColor: rows[0].primaryColor,
    },
    customer: null,
  };
  response.json({ html: await renderQuotationHtml(document, input.locale) });
});
quotationDocumentsRouter.get('/:id/pdf', pdfLimit, async (request, response) => {
  const query = z
    .object({ locale: localeInput, version: z.coerce.number().int().positive().optional() })
    .strict()
    .parse(request.query);
  const document = await readQuotation(
    idInput.parse(request.params.id),
    response.locals.session.user,
    query.version,
  );
  response
    .type('application/pdf')
    .set(
      'Content-Disposition',
      `attachment; filename="quotation-${document.reference}-${query.locale}.pdf"`,
    )
    .send(await renderQuotationPdf(document, query.locale));
});
quotationDocumentsRouter.get('/:id/presentation', async (request, response) => {
  const query = z
    .object({ locale: localeInput, version: z.coerce.number().int().positive().optional() })
    .strict()
    .parse(request.query);
  response.json({
    html: await renderQuotationHtml(
      await readQuotation(
        idInput.parse(request.params.id),
        response.locals.session.user,
        query.version,
      ),
      query.locale,
    ),
  });
});
quotationDocumentsRouter.get('/:id/shares', async (request, response) =>
  response.json({
    shares: await listQuotationShares(
      idInput.parse(request.params.id),
      response.locals.session.user,
    ),
  }),
);
quotationDocumentsRouter.post('/:id/shares', requireCsrf, async (request, response) => {
  const input = z
    .object({ version: z.number().int().positive(), expiresAt: z.iso.datetime() })
    .strict()
    .parse(request.body);
  response
    .status(201)
    .json(
      await createQuotationShare(
        idInput.parse(request.params.id),
        input.version,
        input.expiresAt,
        response.locals.session.user,
      ),
    );
});
quotationDocumentsRouter.delete('/:id/shares/:shareId', requireCsrf, async (request, response) => {
  await revokeQuotationShare(
    idInput.parse(request.params.id),
    z.uuid().parse(request.params.shareId),
    response.locals.session.user,
  );
  response.status(204).end();
});
export const publicQuotationsRouter = Router();
publicQuotationsRouter.use(
  rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }),
);
publicQuotationsRouter.get('/:shareId', async (request, response) => {
  const query = z.object({ locale: localeInput }).strict().parse(request.query);
  const value = await readPublicQuotation(
    z.uuid().parse(request.params.shareId),
    request.get('X-Quotation-Token') ?? '',
  );
  response.json({
    reference: value.document.reference,
    version: value.document.version,
    status: value.document.status,
    expiresAt: value.expiresAt,
    superseded: value.superseded,
    html: await renderQuotationHtml(value.document, query.locale),
  });
});
publicQuotationsRouter.get('/:shareId/pdf', pdfLimit, async (request, response) => {
  const query = z.object({ locale: localeInput }).strict().parse(request.query);
  const { document } = await readPublicQuotation(
    z.uuid().parse(request.params.shareId),
    request.get('X-Quotation-Token') ?? '',
  );
  response
    .type('application/pdf')
    .set(
      'Content-Disposition',
      `attachment; filename="quotation-${document.reference}-${query.locale}.pdf"`,
    )
    .send(await renderQuotationPdf(document, query.locale));
});
