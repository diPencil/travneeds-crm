import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type {
  InvoiceDocument,
  InvoiceInput,
} from '../../../../shared/finance/invoice.contracts.js';
import type { InvoiceTotals } from '../../../../shared/finance/invoice-calculation.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';

export async function readInvoiceDocument(id: string): Promise<InvoiceDocument> {
  const [rows] = await pool.execute<(RowDataPacket & InvoiceDocument)[]>(
    `SELECT
    CAST(i.id AS CHAR) AS id,CAST(i.booking_id AS CHAR) AS bookingId,b.booking_reference AS bookingReference,
    i.invoice_number AS number,i.party,i.bill_to AS billTo,i.kind,i.status,i.currency,i.amount,
    i.issued_on AS issuedOn,i.due_on AS dueOn,i.payment_terms AS terms,i.notes,i.document_date AS documentDate,
    i.customer_email AS customerEmail,i.customer_phone AS customerPhone,i.customer_address AS customerAddress,
    i.issuer_name AS issuerName,i.issuer_logo AS issuerLogo,i.issuer_address AS issuerAddress,i.issuer_contact AS issuerContact,
    i.customer_reference AS reference,i.subtotal,i.discount_amount AS discount,i.tax_rate AS taxRate,i.tax_label AS taxLabel,
    i.tax_amount AS taxAmount,i.version FROM finance_invoices i
    LEFT JOIN finance_booking_accounts b ON b.id=i.booking_id WHERE i.id=?`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  const [items] = await pool.execute<(RowDataPacket & InvoiceDocument['items'][number])[]>(
    'SELECT description,quantity,unit_price AS unitPrice,amount FROM finance_invoice_items WHERE invoice_id=? ORDER BY position',
    [id],
  );
  return { ...rows[0], items };
}
export async function lockEditableInvoice(connection: PoolConnection, id: string) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT status,version,request_key FROM finance_invoices WHERE id=? FOR UPDATE',
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  // Source snapshots are owned by their future adapter, not this editor.
  if (!rows[0].request_key) throw new HttpError(409, 'INVOICE_NOT_EDITABLE');
  return rows[0];
}
export async function requireInvoiceBooking(connection: PoolConnection, input: InvoiceInput) {
  if (!input.bookingId) return;
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT b.currency FROM finance_booking_accounts b
    JOIN finance_sources s ON s.code=b.source_code AND s.status='connected' WHERE b.id=? FOR UPDATE`,
    [input.bookingId],
  );
  if (!rows[0]) throw new HttpError(409, 'BOOKING_SOURCE_NOT_CONNECTED');
  if (rows[0].currency !== input.currency) throw new HttpError(400, 'INVOICE_CURRENCY_MISMATCH');
}
export async function saveInvoiceContent(
  connection: PoolConnection,
  id: string,
  input: InvoiceInput,
  totals: InvoiceTotals,
) {
  await connection.execute(
    `UPDATE finance_invoices SET booking_id=?,bill_to=?,currency=?,amount=?,document_date=?,due_on=?,
    customer_email=?,customer_phone=?,customer_address=?,issuer_address=?,issuer_contact=?,customer_reference=?,
    subtotal=?,discount_amount=?,tax_rate=?,tax_label=?,tax_amount=?,payment_terms=?,notes=? WHERE id=?`,
    [
      input.bookingId || null,
      input.billTo,
      input.currency,
      totals.total,
      input.documentDate,
      input.dueOn || null,
      input.customerEmail || null,
      input.customerPhone || null,
      input.customerAddress || null,
      input.issuerAddress || null,
      input.issuerContact || null,
      input.reference || null,
      totals.subtotal,
      totals.discount,
      input.taxRate,
      input.taxLabel || null,
      totals.taxAmount,
      input.terms || null,
      input.notes || null,
      id,
    ],
  );
  await connection.execute('DELETE FROM finance_invoice_items WHERE invoice_id=?', [id]);
  for (const [index, item] of input.items.entries())
    await connection.execute(
      'INSERT INTO finance_invoice_items (invoice_id,position,description,quantity,unit_price,amount) VALUES (?,?,?,?,?,?)',
      [id, index + 1, item.description, item.quantity, item.unitPrice, totals.lineAmounts[index]],
    );
}
export async function nextInvoiceNumber(connection: PoolConnection, year: number) {
  // Take an exclusive counter lock immediately. INSERT IGNORE can leave two
  // issuers holding shared locks that deadlock when upgraded by FOR UPDATE.
  await connection.execute(
    'INSERT INTO finance_invoice_counters (period,last_number) VALUES (?,0) ON DUPLICATE KEY UPDATE last_number=last_number',
    [year],
  );
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT last_number FROM finance_invoice_counters WHERE period=? FOR UPDATE',
    [year],
  );
  const next = Number(rows[0].last_number) + 1;
  await connection.execute('UPDATE finance_invoice_counters SET last_number=? WHERE period=?', [
    next,
    year,
  ]);
  return `INV-${year}-${String(next).padStart(6, '0')}`;
}
