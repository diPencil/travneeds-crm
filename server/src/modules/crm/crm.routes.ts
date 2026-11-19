import { Router } from 'express';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { pool } from '../../database/pool.js';
import { requireAdmin, requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { HttpError } from '../../http/errors.js';
import {
  listRecords,
  readRecord,
  saveRecord,
  archiveRecord,
  convertLead,
  parseRecord,
} from './crm.service.js';
import { listInput, recordIdInput, convertLeadInput } from './crm.validation.js';

export const crmRouter = Router();
crmRouter.use(requireSession);
const kindInput = z.enum(['leads', 'customers', 'suppliers']);
crmRouter.get('/options', async (_request, response) => {
  const [agents] = await pool.query<RowDataPacket[]>(
    "SELECT id,full_name AS fullName FROM users WHERE status = 'active' ORDER BY full_name",
  );
  const [categories] = await pool.query<RowDataPacket[]>(
    'SELECT DISTINCT category FROM suppliers WHERE archived_at IS NULL ORDER BY category',
  );
  const [settings] = await pool.query<RowDataPacket[]>(
    'SELECT base_currency AS baseCurrency FROM project_settings WHERE id = 1',
  );
  response.json({
    agents,
    categories: categories.map((row) => row.category),
    baseCurrency: settings[0].baseCurrency,
  });
});
crmRouter.get('/:kind', async (request, response) => {
  const query = listInput.parse(request.query);
  if (
    query.archived === 'true' &&
    !(response.locals.session as AuthSession).user.roles.includes('admin')
  )
    throw new HttpError(403, 'FORBIDDEN');
  response.json(
    await listRecords(
      kindInput.parse(request.params.kind),
      query,
      (response.locals.session as AuthSession).user,
    ),
  );
});
crmRouter.get('/:kind/:id', async (request, response) => {
  const result = await readRecord(
    kindInput.parse(request.params.kind),
    recordIdInput.parse(request.params.id),
  );
  if (result.archivedAt && !(response.locals.session as AuthSession).user.roles.includes('admin'))
    throw new HttpError(403, 'FORBIDDEN');
  response.json(result);
});
crmRouter.use(requireCsrf);
crmRouter.post('/:kind', async (request, response) => {
  const kind = kindInput.parse(request.params.kind);
  response
    .status(201)
    .json(
      await saveRecord(
        kind,
        parseRecord(kind, request.body),
        (response.locals.session as AuthSession).user.id,
      ),
    );
});
crmRouter.patch('/:kind/:id', async (request, response) => {
  const kind = kindInput.parse(request.params.kind);
  const body = z.record(z.string(), z.unknown()).parse(request.body);
  const { version, ...details } = body;
  const expectedVersion = z.number().int().positive().parse(version);
  response.json(
    await saveRecord(
      kind,
      parseRecord(kind, details),
      (response.locals.session as AuthSession).user.id,
      recordIdInput.parse(request.params.id),
      expectedVersion,
    ),
  );
});
crmRouter.patch('/:kind/:id/archive', requireAdmin, async (request, response) => {
  const input = z
    .object({ version: z.number().int().positive(), archived: z.boolean() })
    .strict()
    .parse(request.body);
  await archiveRecord(
    kindInput.parse(request.params.kind),
    recordIdInput.parse(request.params.id),
    input.version,
    input.archived,
    (response.locals.session as AuthSession).user.id,
  );
  response.status(204).end();
});
crmRouter.post('/leads/:id/convert', async (request, response) => {
  const input = convertLeadInput.parse(request.body);
  response.json(
    await convertLead(
      recordIdInput.parse(request.params.id),
      input.version,
      (response.locals.session as AuthSession).user.id,
      input.customerId,
    ),
  );
});
