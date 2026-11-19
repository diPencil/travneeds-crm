import { Router } from 'express';
import { requireAdmin, requireSession, requireCsrf } from '../auth/auth.middleware.js';
import { financeQuery, financeInvoiceQuery, financeId } from './finance.validation.js';
import {
  readOptions,
  readOverview,
  readInvoices,
  readReports,
  readBookingDetail,
  readInvoiceDetail,
} from './finance.service.js';

import { createInvoiceInput, updateInvoiceInput, issueInvoiceInput } from './invoice.validation.js';
import { createInvoice, updateInvoice, issueInvoice } from './invoice.service.js';

export const financeRouter = Router();
financeRouter.use(requireSession, requireAdmin);
financeRouter.get('/', async (request, response) => {
  response.json(await readOverview(financeQuery.parse(request.query)));
});
financeRouter.get('/export', async (request, response) => {
  response.json(await readOverview(financeQuery.parse(request.query), true));
});
financeRouter.get('/options', async (_request, response) => {
  response.json(await readOptions());
});
financeRouter.get('/reports', async (request, response) => {
  response.json(await readReports(financeQuery.parse(request.query)));
});
financeRouter.get('/invoices', async (request, response) => {
  response.json(await readInvoices(financeInvoiceQuery.parse(request.query)));
});
financeRouter.get('/invoices/export', async (request, response) => {
  response.json(await readInvoices(financeInvoiceQuery.parse(request.query), true));
});
financeRouter.get('/invoices/:id', async (request, response) => {
  response.json(await readInvoiceDetail(financeId.parse(request.params.id)));
});
financeRouter.get('/bookings/:id', async (request, response) => {
  response.json(await readBookingDetail(financeId.parse(request.params.id)));
});
financeRouter.post('/invoices', requireCsrf, async (request, response) => {
  response
    .status(201)
    .json(
      await createInvoice(createInvoiceInput.parse(request.body), response.locals.session.user.id),
    );
});
financeRouter.patch('/invoices/:id', requireCsrf, async (request, response) => {
  response.json(
    await updateInvoice(
      financeId.parse(request.params.id),
      updateInvoiceInput.parse(request.body),
      response.locals.session.user.id,
    ),
  );
});
financeRouter.post('/invoices/:id/issue', requireCsrf, async (request, response) => {
  const input = issueInvoiceInput.parse(request.body);
  response.json(
    await issueInvoice(
      financeId.parse(request.params.id),
      input.version,
      response.locals.session.user.id,
    ),
  );
});
// Payment posting remains closed until its authoritative workflow is connected.
financeRouter.use((_request, response) => {
  response
    .set('Allow', 'GET')
    .status(405)
    .json({ error: { code: 'FINANCE_POSTING_UNAVAILABLE' } });
});
