import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { z } from 'zod';
import { calculateInvoice } from '../../../../shared/finance/invoice-calculation.js';
import { transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { createInvoiceInput, updateInvoiceInput } from './invoice.validation.js';
import * as repository from './invoice.repository.js';

export async function createInvoice(input: z.infer<typeof createInvoiceInput>, actorId: string) {
  const totals = calculateInvoice(input.items, input.discount, input.taxRate);
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const id = await transaction(async (connection) => {
    await repository.requireInvoiceBooking(connection, input);
    const [settings] = await connection.execute<RowDataPacket[]>(
      'SELECT project_name,logo_url FROM project_settings WHERE id=1',
    );
    if (!settings[0]) throw new HttpError(503, 'SETTINGS_UNAVAILABLE');
    await connection.execute(
      `INSERT INTO finance_invoices (request_key,request_digest,party,bill_to,kind,status,currency,amount,issuer_name,issuer_logo,created_by)
      VALUES (?,?,'customer',?,'standard','draft',?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [
        input.requestKey,
        digest,
        input.billTo,
        input.currency,
        totals.total,
        settings[0].project_name,
        settings[0].logo_url,
        actorId,
      ],
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT CAST(id AS CHAR) AS id,request_digest,subtotal FROM finance_invoices WHERE request_key=? FOR UPDATE',
      [input.requestKey],
    );
    const row = rows[0];
    if (row.request_digest !== digest) throw new HttpError(409, 'INVOICE_REQUEST_CONFLICT');
    if (row.subtotal !== null) return String(row.id);
    await repository.saveInvoiceContent(connection, String(row.id), input, totals);
    await writeAuditEvent(connection, {
      actorId,
      action: 'finance.invoice_created',
      entityType: 'invoice',
      entityId: String(row.id),
      module: 'finance',
    });
    return String(row.id);
  });
  return { invoice: await repository.readInvoiceDocument(id) };
}
export async function updateInvoice(
  id: string,
  input: z.infer<typeof updateInvoiceInput>,
  actorId: string,
) {
  const totals = calculateInvoice(input.items, input.discount, input.taxRate);
  await transaction(async (connection) => {
    const invoice = await repository.lockEditableInvoice(connection, id);
    if (invoice.status !== 'draft') throw new HttpError(409, 'INVOICE_IMMUTABLE');
    if (invoice.version !== input.version) throw new HttpError(409, 'RECORD_CHANGED');
    await repository.requireInvoiceBooking(connection, input);
    await repository.saveInvoiceContent(connection, id, input, totals);
    await connection.execute('UPDATE finance_invoices SET version=version+1 WHERE id=?', [id]);
    await writeAuditEvent(connection, {
      actorId,
      action: 'finance.invoice_updated',
      entityType: 'invoice',
      entityId: id,
      module: 'finance',
    });
  });
  return { invoice: await repository.readInvoiceDocument(id) };
}
export async function issueInvoice(id: string, version: number, actorId: string) {
  await transaction(async (connection) => {
    const invoice = await repository.lockEditableInvoice(connection, id);
    if (invoice.status === 'issued') return;
    if (invoice.status !== 'draft') throw new HttpError(409, 'INVOICE_IMMUTABLE');
    if (invoice.version !== version) throw new HttpError(409, 'RECORD_CHANGED');
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT document_date,subtotal FROM finance_invoices WHERE id=?',
      [id],
    );
    if (!rows[0].document_date || rows[0].subtotal === null)
      throw new HttpError(409, 'INVOICE_INCOMPLETE');
    const number = await repository.nextInvoiceNumber(
      connection,
      Number(String(rows[0].document_date).slice(0, 4)),
    );
    await connection.execute(
      "UPDATE finance_invoices SET status='issued',invoice_number=?,issued_on=document_date,version=version+1 WHERE id=?",
      [number, id],
    );
    await writeAuditEvent(connection, {
      actorId,
      action: 'finance.invoice_issued',
      entityType: 'invoice',
      entityId: id,
      module: 'finance',
    });
  });
  return { invoice: await repository.readInvoiceDocument(id) };
}
