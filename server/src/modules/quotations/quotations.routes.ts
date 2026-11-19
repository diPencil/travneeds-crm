import { readCatalogueSelection } from '../catalogue/catalogue.repository.js';
import { Router } from 'express';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import {
  quotationSaveInput,
  quotationListInput,
} from '../../../../shared/quotations/quotation.validation.js';
import { pool } from '../../database/pool.js';
import { requireSession, requireCsrf } from '../auth/auth.middleware.js';
import { saveQuotation } from './quotations.service.js';
import { listQuotations, readQuotation } from './quotations.repository.js';

import { quotationDocumentsRouter } from './quotation-documents.routes.js';

export const quotationId = z.string().regex(/^[1-9]\d{0,18}$/);
export const quotationsRouter = Router();
quotationsRouter.use(requireSession);
quotationsRouter.use(quotationDocumentsRouter);
quotationsRouter.get('/options', async (_request, response) => {
  const [customers] = await pool.query<RowDataPacket[]>(
    "SELECT CAST(id AS CHAR) AS id,full_name AS name,email,phone FROM customers WHERE archived_at IS NULL AND status<>'Suspended' ORDER BY full_name",
  );
  const [suppliers] = await pool.query<RowDataPacket[]>(
    "SELECT CAST(id AS CHAR) AS id,full_name AS name FROM suppliers WHERE archived_at IS NULL AND status='Active' ORDER BY full_name",
  );
  const [settings] = await pool.query<RowDataPacket[]>(
    'SELECT base_currency AS baseCurrency FROM project_settings WHERE id=1',
  );
  const [currencies] = await pool.query<RowDataPacket[]>(
    'SELECT code FROM project_currencies ORDER BY code',
  );
  response.json({
    catalogue: await readCatalogueSelection(),
    customers,
    suppliers,
    baseCurrency: settings[0].baseCurrency,
    currencies: currencies.map((row) => row.code),
  });
});
quotationsRouter.get('/', async (request, response) =>
  response.json(
    await listQuotations(quotationListInput.parse(request.query), response.locals.session.user),
  ),
);
quotationsRouter.get('/:id', async (request, response) => {
  const query = z
    .object({ version: z.coerce.number().int().positive().optional() })
    .strict()
    .parse(request.query);
  response.json(
    await readQuotation(
      quotationId.parse(request.params.id),
      response.locals.session.user,
      query.version,
    ),
  );
});
quotationsRouter.post('/', requireCsrf, async (request, response) =>
  response
    .status(201)
    .json(
      await saveQuotation(quotationSaveInput.parse(request.body), response.locals.session.user),
    ),
);
quotationsRouter.patch('/:id', requireCsrf, async (request, response) =>
  response.json(
    await saveQuotation(
      quotationSaveInput.parse(request.body),
      response.locals.session.user,
      quotationId.parse(request.params.id),
    ),
  ),
);
quotationsRouter.post('/:id/status', requireCsrf, async (request, response) => {
  const input = z
    .object({
      version: z.number().int().positive(),
      requestKey: z.uuid(),
      status: z.enum(['draft', 'ready', 'sent', 'accepted', 'declined']),
    })
    .strict()
    .parse(request.body);
  const id = quotationId.parse(request.params.id);
  const saved = await readQuotation(id, response.locals.session.user);
  response.json(
    await saveQuotation(
      {
        customerId: saved.customerId ?? '',
        content: saved.content,
        version: input.version,
        requestKey: input.requestKey,
      },
      response.locals.session.user,
      id,
      input.status,
    ),
  );
});
