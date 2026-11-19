import type { RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  Booking,
  BookingDirectory,
  BookingStatus,
} from '../../../../shared/bookings/booking.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';

export function bookingScope(actor: AuthUser) {
  return actor.roles.includes('admin')
    ? { clause: '1=1', values: [] as string[] }
    : { clause: 'b.owner_id=?', values: [actor.id] };
}
const projection = `CAST(b.id AS CHAR) AS id,f.booking_reference AS reference,
CAST(b.quotation_id AS CHAR) AS quotationId,q.reference AS quotationReference,b.quotation_version AS quotationVersion,
CAST(b.customer_id AS CHAR) AS customerId,f.customer_name AS customerName,
JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.title.en')) AS titleEn,
JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.title.ar')) AS titleAr,
JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.pricing.startDate')) AS startDate,
JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.pricing.endDate')) AS endDate,
f.currency,f.total_amount AS total,b.status,b.version,CAST(b.finance_id AS CHAR) AS financeId,b.created_at AS createdAt`;
const from = `FROM travel_bookings b JOIN finance_booking_accounts f ON f.id=b.finance_id
JOIN quotations q ON q.id=b.quotation_id
JOIN quotation_revisions r ON r.quotation_id=q.id AND r.version=b.quotation_version`;

function toBooking(row: RowDataPacket): Booking {
  const { titleEn, titleAr, ...booking } = row;
  return { ...booking, title: { en: titleEn, ar: titleAr } } as Booking;
}
export async function readBooking(
  actor: AuthUser,
  identifier: { id: string } | { quotationId: string },
) {
  const scope = bookingScope(actor);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${projection} ${from} WHERE ${scope.clause} AND ${'id' in identifier ? 'b.id' : 'b.quotation_id'}=?`,
    [...scope.values, 'id' in identifier ? identifier.id : identifier.quotationId],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  return toBooking(rows[0]);
}

export async function listBookings(
  actor: AuthUser,
  query: { page: number; search: string; status?: BookingStatus; customerId?: string },
): Promise<BookingDirectory> {
  const scope = bookingScope(actor);
  const filters = [scope.clause];
  const values = [...scope.values];
  if (query.customerId) {
    filters.push('b.customer_id=?');
    values.push(query.customerId);
  }
  const metricsWhere = filters.join(' AND ');
  const [statusRows] = await pool.execute<
    (RowDataPacket & { status: BookingStatus; count: string })[]
  >(
    `SELECT b.status,COUNT(*) AS count FROM travel_bookings b WHERE ${metricsWhere} GROUP BY b.status`,
    values,
  );
  const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const row of statusRows) counts[row.status] = Number(row.count);
  const [totals] = await pool.execute<(RowDataPacket & BookingDirectory['totals'][number])[]>(
    `SELECT f.currency,SUM(f.total_amount) AS amount FROM travel_bookings b
    JOIN finance_booking_accounts f ON f.id=b.finance_id WHERE ${metricsWhere}
    AND b.status IN ('confirmed','completed') GROUP BY f.currency ORDER BY f.currency`,
    values,
  );
  if (query.status) {
    filters.push('b.status=?');
    values.push(query.status);
  }
  if (query.search) {
    const search = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    filters.push(
      "(f.booking_reference LIKE ? ESCAPE '!' OR f.customer_name LIKE ? ESCAPE '!' OR q.reference LIKE ? ESCAPE '!')",
    );
    values.push(search, search, search);
  }
  const where = `WHERE ${filters.join(' AND ')}`;
  const [[count], [rows]] = await Promise.all([
    pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from} ${where}`, values),
    pool.execute<RowDataPacket[]>(
      `SELECT ${projection} ${from} ${where} ORDER BY b.id DESC LIMIT 30 OFFSET ?`,
      [...values, (query.page - 1) * 30],
    ),
  ]);
  return {
    bookings: rows.map(toBooking),
    total: Number(count[0].total),
    page: query.page,
    pageSize: 30,
    counts,
    totals,
  };
}

export async function bookingCandidates(actor: AuthUser, search: string, customerId?: string) {
  const scope = actor.roles.includes('admin') ? [] : [actor.id];
  const pattern = `%${search.replace(/[!%_]/g, '!$&')}%`;
  const [options] = await pool.execute<RowDataPacket[]>(
    `SELECT CAST(q.id AS CHAR) AS id,q.reference,q.current_version AS version,c.full_name AS customerName,q.total,q.currency
     FROM quotations q JOIN customers c ON c.id=q.customer_id
     WHERE q.status IN ('ready','sent','accepted') AND q.valid_until>=UTC_DATE()
       AND q.total IS NOT NULL AND c.archived_at IS NULL AND c.status<>'Suspended'
       ${scope.length ? 'AND q.created_by=?' : ''} ${customerId ? 'AND q.customer_id=?' : ''}
       AND (q.reference LIKE ? ESCAPE '!' OR c.full_name LIKE ? ESCAPE '!')
     ORDER BY q.updated_at DESC LIMIT 30`,
    [...scope, ...(customerId ? [customerId] : []), pattern, pattern],
  );
  return options;
}
