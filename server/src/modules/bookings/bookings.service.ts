import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import {
  bookingTransitions,
  type BookingStatus,
} from '../../../../shared/bookings/booking.contracts.js';
import type {
  QuotationContent,
  QuotationDocument,
  QuotationPrice,
} from '../../../../shared/quotations/quotation.contracts.js';
import { transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { actorScope } from '../quotations/quotations.repository.js';
import { bookingScope, readBooking } from './bookings.repository.js';

export async function createBooking(
  actor: AuthUser,
  input: { quotationId: string; quotationVersion: number; requestKey: string },
) {
  const id = await transaction(async (connection) => {
    const scope = actorScope(actor);
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT q.reference,q.customer_id,q.status,q.created_by,q.current_version,q.valid_until>=UTC_DATE() AS valid
       FROM quotations q WHERE q.id=? AND ${scope.sql} FOR UPDATE`,
      [input.quotationId, ...scope.values],
    );
    const quote = rows[0];
    if (!quote) throw new HttpError(404, 'NOT_FOUND');
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT CAST(id AS CHAR) AS id,quotation_version,request_key,created_by FROM travel_bookings WHERE quotation_id=?',
      [input.quotationId],
    );
    if (existing[0]) {
      const booking = existing[0];
      if (
        booking.request_key === input.requestKey &&
        booking.quotation_version === input.quotationVersion &&
        booking.created_by === actor.id
      )
        return booking.id as string;
      throw new HttpError(409, 'QUOTATION_ALREADY_BOOKED');
    }
    if (quote.current_version !== input.quotationVersion)
      throw new HttpError(409, 'RECORD_CHANGED');
    if (!quote.valid || !['ready', 'sent', 'accepted'].includes(quote.status))
      throw new HttpError(409, 'QUOTATION_NOT_BOOKABLE');
    const [customers] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM customers WHERE id=? AND archived_at IS NULL AND status<>'Suspended' FOR UPDATE",
      [quote.customer_id],
    );
    if (!customers[0]) throw new HttpError(409, 'CUSTOMER_UNAVAILABLE');
    const [revisions] = await connection.execute<RowDataPacket[]>(
      'SELECT content_json,price_json,context_json FROM quotation_revisions WHERE quotation_id=? AND version=?',
      [input.quotationId, input.quotationVersion],
    );
    const revision = revisions[0];
    const price = revision?.price_json ? (JSON.parse(revision.price_json) as QuotationPrice) : null;
    const customer = revision
      ? (JSON.parse(revision.context_json) as Pick<QuotationDocument, 'customer'>).customer
      : null;
    if (!price || !customer || price.onRequestAddOns.length)
      throw new HttpError(409, 'QUOTATION_NOT_BOOKABLE');
    const content = JSON.parse(revision.content_json) as QuotationContent;
    const [account] = await connection.execute<ResultSetHeader>(
      `INSERT INTO finance_booking_accounts
       (source_code,source_booking_key,booking_reference,customer_id,customer_name,agent_id,service_category,
        currency,total_amount,supplier_cost_total,total_cost,booked_at,synchronized_at,is_reporting)
       VALUES ('trips',?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),FALSE)`,
      [
        `quotation:${input.quotationId}`,
        `BK-${input.quotationId.padStart(6, '0')}`,
        quote.customer_id,
        customer.fullName,
        quote.created_by,
        content.type,
        price.currency,
        price.total,
        price.supplierCost,
        price.totalCost,
      ],
    );
    const supplierIds = new Set(
      [...content.hotels, ...content.pricing.costItems]
        .map((entry) => entry.supplierId)
        .filter(Boolean),
    );
    for (const supplierId of supplierIds) {
      await connection.execute(
        'INSERT INTO finance_booking_suppliers (booking_id,supplier_id) VALUES (?,?)',
        [account.insertId, supplierId],
      );
    }
    const [created] = await connection.execute<ResultSetHeader>(
      `INSERT INTO travel_bookings (quotation_id,quotation_version,customer_id,finance_id,owner_id,created_by,request_key)
       VALUES (?,?,?,?,?,?,?)`,
      [
        input.quotationId,
        input.quotationVersion,
        quote.customer_id,
        account.insertId,
        quote.created_by,
        actor.id,
        input.requestKey,
      ],
    );
    await connection.execute("UPDATE quotations SET status='booked' WHERE id=?", [
      input.quotationId,
    ]);
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: 'bookings.created',
      entityType: 'booking',
      entityId: String(created.insertId),
      module: 'bookings',
      details: `Quotation ${quote.reference}, revision ${input.quotationVersion}`,
    });
    return String(created.insertId);
  }).catch((error: unknown) => {
    if ((error as { code?: string } | null)?.code === 'ER_DUP_ENTRY')
      throw new HttpError(409, 'BOOKING_REQUEST_CONFLICT');
    throw error;
  });
  return readBooking(actor, { id });
}

export async function setBookingStatus(
  actor: AuthUser,
  id: string,
  version: number,
  status: BookingStatus,
) {
  await transaction(async (connection) => {
    const scope = bookingScope(actor);
    const [rows] = await connection.execute<(RowDataPacket & { status: BookingStatus })[]>(
      `SELECT b.status,b.version,b.finance_id FROM travel_bookings b WHERE b.id=? AND ${scope.clause} FOR UPDATE`,
      [id, ...scope.values],
    );
    const row = rows[0];
    if (!row) throw new HttpError(404, 'NOT_FOUND');
    if (row.version !== version) throw new HttpError(409, 'RECORD_CHANGED');
    if (!bookingTransitions[row.status].includes(status))
      throw new HttpError(409, 'INVALID_BOOKING_TRANSITION');
    await connection.execute('UPDATE travel_bookings SET status=?,version=version+1 WHERE id=?', [
      status,
      id,
    ]);
    await connection.execute(
      'UPDATE finance_booking_accounts SET is_reporting=?,synchronized_at=UTC_TIMESTAMP(6) WHERE id=?',
      [status === 'confirmed' || status === 'completed', row.finance_id],
    );
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: `bookings.${status}`,
      entityType: 'booking',
      entityId: id,
      module: 'bookings',
    });
  });
  return readBooking(actor, { id });
}
