import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type {
  QuotationContent,
  QuotationDirectory,
  QuotationDocument,
  QuotationPrice,
  QuotationStatus,
  QuotationSummary,
} from '../../../../shared/quotations/quotation.contracts.js';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';

export const actualStatus =
  "CASE WHEN q.valid_until<UTC_DATE() AND q.status NOT IN ('draft','booked','declined') THEN 'expired' ELSE q.status END";
const columns = `CAST(q.id AS CHAR) AS id,q.reference,CAST(q.customer_id AS CHAR) AS customerId,c.full_name AS customerName,q.trip_type AS type,
  ${actualStatus} AS status,q.currency,q.total,q.current_version AS version,q.valid_until AS validUntil,q.created_at AS createdAt,q.updated_at AS updatedAt,q.created_by AS createdBy`;
export function actorScope(actor: AuthUser, alias = 'q') {
  return actor.roles.includes('admin')
    ? { sql: '1=1', values: [] as string[] }
    : { sql: `${alias}.created_by=?`, values: [actor.id] };
}
export async function readQuotation(
  id: string,
  actor: AuthUser,
  version?: number,
): Promise<QuotationDocument> {
  const scope = actorScope(actor);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${columns},r.version AS revision,r.content_json,r.price_json,r.context_json
    FROM quotations q LEFT JOIN customers c ON c.id=q.customer_id
    JOIN quotation_revisions r ON r.quotation_id=q.id AND r.version=${version ? '?' : 'q.current_version'} WHERE q.id=? AND ${scope.sql}`,
    [...(version ? [version] : []), id, ...scope.values],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  return quotationFromRow(rows[0]);
}
export function quotationFromRow(row: RowDataPacket): QuotationDocument {
  const content = JSON.parse(row.content_json) as QuotationContent;
  const context = JSON.parse(row.context_json) as Pick<QuotationDocument, 'branding' | 'customer'>;
  return {
    id: String(row.id),
    reference: row.reference,
    customerId: row.customerId ?? null,
    customerName: row.customerName ?? context.customer?.fullName ?? null,
    title: content.title,
    type: content.type,
    status: row.status,
    currency: content.pricing.currency,
    total: row.price_json ? (JSON.parse(row.price_json) as QuotationPrice).total : null,
    version: Number(row.revision ?? row.version),
    validUntil: content.validUntil || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    content,
    price: row.price_json ? (JSON.parse(row.price_json) as QuotationPrice) : null,
    ...context,
  };
}
export async function listQuotations(
  query: { search: string; status: string; type: string; page: number },
  actor: AuthUser,
): Promise<QuotationDirectory> {
  const scope = actorScope(actor);
  const [counts] = await pool.execute<RowDataPacket[]>(
    `SELECT ${actualStatus} AS status,COUNT(*) AS count FROM quotations q WHERE ${scope.sql} GROUP BY ${actualStatus}`,
    scope.values,
  );
  const metrics = {
    total: 0,
    draft: 0,
    ready: 0,
    sent: 0,
    accepted: 0,
    booked: 0,
    expired: 0,
    declined: 0,
  };
  for (const row of counts) {
    metrics[row.status as QuotationStatus] = Number(row.count);
    metrics.total += Number(row.count);
  }
  const clauses = [scope.sql];
  const values = [...scope.values];
  if (query.search) {
    clauses.push(
      "(q.reference LIKE ? ESCAPE '!' OR c.full_name LIKE ? ESCAPE '!' OR JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.title.en')) LIKE ? ESCAPE '!' OR JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.title.ar')) LIKE ? ESCAPE '!')",
    );
    const pattern = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    values.push(pattern, pattern, pattern, pattern);
  }
  if (query.status) {
    clauses.push(`${actualStatus}=?`);
    values.push(query.status);
  }
  if (query.type) {
    clauses.push('q.trip_type=?');
    values.push(query.type);
  }
  const from = `FROM quotations q LEFT JOIN customers c ON c.id=q.customer_id JOIN quotation_revisions r ON r.quotation_id=q.id AND r.version=q.current_version WHERE ${clauses.join(' AND ')}`;
  const [totals] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from}`, values);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${columns},r.content_json ${from} ORDER BY q.updated_at DESC,q.id DESC LIMIT 30 OFFSET ?`,
    [...values, (query.page - 1) * 30],
  );
  const quotations = rows.map(
    (row) =>
      ({
        id: String(row.id),
        reference: row.reference,
        customerId: row.customerId,
        customerName: row.customerName,
        title: (JSON.parse(row.content_json) as QuotationContent).title,
        type: row.type,
        status: row.status,
        currency: row.currency,
        total: row.total,
        version: Number(row.version),
        validUntil: row.validUntil,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdBy: row.createdBy,
      }) as QuotationSummary,
  );
  return { quotations, total: Number(totals[0].total), metrics, page: query.page, pageSize: 30 };
}
export async function readQuotationContext(connection: PoolConnection, customerId: string) {
  const [settings] = await connection.query<RowDataPacket[]>(
    'SELECT project_name AS projectName,logo_url AS logoUrl,primary_color AS primaryColor FROM project_settings WHERE id=1',
  );
  if (!settings[0]) throw new HttpError(503, 'SETTINGS_UNAVAILABLE');
  let customer: QuotationDocument['customer'] = null;
  if (customerId) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT CAST(id AS CHAR) AS id,full_name AS fullName,email,phone FROM customers WHERE id=? AND archived_at IS NULL AND status<>'Suspended'",
      [customerId],
    );
    if (!rows[0]) throw new HttpError(400, 'CUSTOMER_UNAVAILABLE');
    customer = {
      id: String(rows[0].id),
      fullName: rows[0].fullName,
      email: rows[0].email,
      phone: rows[0].phone,
    };
  }
  return { branding: settings[0], customer };
}
export async function validateQuotationReferences(
  connection: PoolConnection,
  content: QuotationContent,
) {
  const supplierIds = [
    ...new Set(
      [
        ...content.hotels.map((stay) => stay.supplierId),
        ...content.pricing.costItems.map((item) => item.supplierId),
      ].filter(Boolean),
    ),
  ];
  for (const id of supplierIds) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM suppliers WHERE id=? AND archived_at IS NULL AND status='Active'",
      [id],
    );
    if (!rows[0]) throw new HttpError(400, 'SUPPLIER_UNAVAILABLE');
  }
}
