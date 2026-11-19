import type {
  QuotationContent,
  QuotationDocument,
  QuotationPrice,
} from '../../../../shared/quotations/quotation.contracts.js';
import type { RowDataPacket } from 'mysql2/promise';
import type {
  FinanceBooking,
  FinanceSummary,
  FinanceInvoice,
  FinancePayment,
  FinanceReports,
} from '../../../../shared/finance/finance.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import type { FinanceQuery, FinanceInvoiceQuery } from './finance.validation.js';

const connectedBookingAccounts =
  "FROM finance_booking_accounts b JOIN finance_sources source ON source.code=b.source_code AND source.status='connected'";

export async function readReportedBookingValue() {
  const [rows] = await pool.query<(RowDataPacket & { currency: string; amount: string })[]>(
    `SELECT b.currency,CAST(SUM(b.total_amount) AS CHAR) AS amount
     ${connectedBookingAccounts} WHERE b.is_reporting=TRUE GROUP BY b.currency ORDER BY b.currency`,
  );
  return rows;
}

// All calculations remain SQL DECIMAL values. mysql2 transports them as text.
// Invoices do not contribute to booking revenue: deposit/proforma documents
// could otherwise count the same booking more than once.
const bookingProjection = `SELECT CAST(b.id AS CHAR) AS id,b.booking_reference AS reference,b.customer_name AS customer,
  b.agent_id AS agentId,u.full_name AS agent,b.service_category AS category,b.currency,b.total_amount AS totalAmount,b.is_reporting AS isReporting,
  CAST(COALESCE(p.received,0) AS DECIMAL(20,2)) AS paidAmount,
  GREATEST(b.total_amount-COALESCE(p.received,0),0) AS outstandingBalance,
  CAST(COALESCE(p.supplierPaid,0) AS DECIMAL(20,2)) AS supplierPaid,
  b.supplier_cost_total AS supplierCost,b.total_cost AS totalCost,
  b.total_amount-b.total_cost AS profit,ROUND((b.total_amount-b.total_cost)/NULLIF(b.total_amount,0)*100,2) AS profitMargin,
  b.due_on AS dueOn,b.booked_at AS bookedAt,
  CASE WHEN b.total_amount<=COALESCE(p.received,0) THEN 'fully_paid'
    WHEN b.due_on<UTC_DATE() THEN 'overdue'
    WHEN COALESCE(p.received,0)>0 AND b.deposit_amount IS NOT NULL AND p.received<=b.deposit_amount THEN 'deposit_paid'
    WHEN COALESCE(p.received,0)>0 THEN 'partially_paid' ELSE 'unpaid' END AS paymentStatus,
  CAST(i.id AS CHAR) AS invoiceId,i.invoice_number AS invoiceNumber,i.status AS invoiceStatus,i.issued_on AS invoiceDate
  ${connectedBookingAccounts}
  LEFT JOIN users u ON u.id=b.agent_id
  LEFT JOIN (SELECT booking_id,
    SUM(CASE WHEN purpose='customer_receipt' THEN amount WHEN purpose='customer_refund' THEN -amount ELSE 0 END) AS received,
    SUM(CASE WHEN purpose='supplier_payment' THEN amount WHEN purpose='supplier_refund' THEN -amount ELSE 0 END) AS supplierPaid
    FROM finance_payments WHERE status='verified' GROUP BY booking_id) p ON p.booking_id=b.id
  LEFT JOIN finance_invoices i ON i.id=(SELECT MAX(latest.id) FROM finance_invoices latest WHERE latest.booking_id=b.id AND latest.party='customer' AND latest.status<>'void')`;

function bookingFilter(query: FinanceQuery, currency: string) {
  const clauses = ['e.currency = ?'];
  const values: (string | number)[] = [currency];
  if (query.search) {
    const pattern = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    clauses.push("(e.reference LIKE ? ESCAPE '!' OR e.customer LIKE ? ESCAPE '!')");
    values.push(pattern, pattern);
  }
  if (query.agent) {
    clauses.push('e.agentId = ?');
    values.push(query.agent);
  }
  if (query.supplier) {
    clauses.push(
      'EXISTS (SELECT 1 FROM finance_booking_suppliers link WHERE link.booking_id=CAST(e.id AS UNSIGNED) AND link.supplier_id=?)',
    );
    values.push(query.supplier);
  }
  if (query.status) {
    clauses.push('e.paymentStatus = ?');
    values.push(query.status);
  }
  if (query.from) {
    clauses.push('e.bookedAt >= ?');
    values.push(`${query.from} 00:00:00`);
  }
  if (query.to) {
    clauses.push('e.bookedAt < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(`${query.to} 00:00:00`);
  }
  return { where: `WHERE ${clauses.join(' AND ')}`, values };
}
const summaryColumns = `COUNT(*) AS bookings,
  COALESCE(SUM(e.paidAmount),0.00) AS cashReceived,COALESCE(SUM(e.outstandingBalance),0.00) AS receivables,
  COALESCE(SUM(e.totalAmount),0.00) AS totalAmount,
  CASE WHEN COUNT(e.supplierCost)=COUNT(*) THEN COALESCE(SUM(GREATEST(e.supplierCost-e.supplierPaid,0)),0.00) ELSE NULL END AS supplierPayables,
  CASE WHEN COUNT(e.totalCost)=COUNT(*) THEN COALESCE(SUM(e.totalCost),0.00) ELSE NULL END AS totalCost,
  CASE WHEN COUNT(e.totalCost)=COUNT(*) THEN COALESCE(SUM(e.totalAmount-e.totalCost),0.00) ELSE NULL END AS netProfit,
  CASE WHEN COUNT(e.totalCost)=COUNT(*) THEN ROUND(SUM(e.totalAmount-e.totalCost)/NULLIF(SUM(e.totalAmount),0)*100,2) ELSE NULL END AS profitMargin,
  COALESCE(SUM(e.paymentStatus='overdue'),0) AS overdue`;

export async function readFinanceConfiguration() {
  const [sources] = await pool.query<RowDataPacket[]>(
    "SELECT status FROM finance_sources WHERE code='trips'",
  );
  const [settings] = await pool.query<RowDataPacket[]>(
    'SELECT base_currency AS baseCurrency FROM project_settings WHERE id=1',
  );
  if (!sources[0] || !settings[0]) throw new HttpError(503, 'FINANCE_CONFIGURATION_UNAVAILABLE');
  return {
    connected: sources[0].status === 'connected',
    baseCurrency: String(settings[0].baseCurrency),
  };
}
export async function readFinanceOptions() {
  const [agents] = await pool.query<(RowDataPacket & { id: string; name: string })[]>(
    "SELECT id,full_name AS name FROM users u WHERE status='active' OR EXISTS(SELECT 1 FROM finance_booking_accounts b WHERE b.agent_id=u.id) ORDER BY full_name",
  );
  const [suppliers] = await pool.query<(RowDataPacket & { id: string; name: string })[]>(
    'SELECT CAST(id AS CHAR) AS id,full_name AS name FROM suppliers s WHERE archived_at IS NULL OR EXISTS(SELECT 1 FROM finance_booking_suppliers link WHERE link.supplier_id=s.id) ORDER BY full_name',
  );
  const [currencies] = await pool.query<RowDataPacket[]>(
    'SELECT DISTINCT currency FROM finance_booking_accounts UNION SELECT currency FROM finance_invoices UNION SELECT base_currency AS currency FROM project_settings ORDER BY currency',
  );
  return { agents, suppliers, currencies: currencies.map((row) => String(row.currency)) };
}
export async function readFinanceBookings(
  query: FinanceQuery,
  currency: string,
  exportAll = false,
) {
  const baseFilter = bookingFilter(query, currency);
  const filter = { ...baseFilter, where: baseFilter.where + ' AND e.isReporting=TRUE' };
  const [counts] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM (${bookingProjection}) e ${filter.where}`,
    filter.values,
  );
  const total = Number(counts[0].total);
  if (exportAll && total > 10000) throw new HttpError(422, 'EXPORT_TOO_LARGE');
  const pageSize = exportAll ? 10000 : 50;
  const [bookings] = await pool.execute<(RowDataPacket & FinanceBooking)[]>(
    `SELECT e.* FROM (${bookingProjection}) e ${filter.where} ORDER BY e.bookedAt DESC,CAST(e.id AS UNSIGNED) DESC LIMIT ? OFFSET ?`,
    [...filter.values, pageSize, exportAll ? 0 : (query.page - 1) * pageSize],
  );
  const [summaries] = await pool.execute<(RowDataPacket & FinanceSummary)[]>(
    `SELECT ${summaryColumns} FROM (${bookingProjection}) e ${filter.where}`,
    filter.values,
  );
  return {
    bookings,
    total,
    page: exportAll ? 1 : query.page,
    pageSize,
    summary: {
      ...summaries[0],
      bookings: Number(summaries[0].bookings),
      overdue: Number(summaries[0].overdue),
    },
  };
}
const invoiceColumns = `CAST(i.id AS CHAR) AS id,CAST(i.booking_id AS CHAR) AS bookingId,e.reference AS bookingReference,i.invoice_number AS number,i.party,i.bill_to AS billTo,i.kind,i.status,i.currency,i.amount,i.issued_on AS issuedOn,i.due_on AS dueOn,i.payment_terms AS terms,i.notes`;
export async function readFinanceInvoices(
  query: FinanceInvoiceQuery,
  currency: string,
  exportAll = false,
) {
  const filter = bookingFilter({ ...query, search: '' }, currency);
  let where =
    filter.where.replace('e.currency = ?', 'i.currency = ?') +
    ' AND (i.booking_id IS NULL OR e.id IS NOT NULL)';
  const values = [...filter.values];
  if (query.search) {
    const pattern = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    where +=
      " AND (i.invoice_number LIKE ? ESCAPE '!' OR i.bill_to LIKE ? ESCAPE '!' OR e.reference LIKE ? ESCAPE '!')";
    values.push(pattern, pattern, pattern);
  }
  if (query.party) {
    where += ' AND i.party=?';
    values.push(query.party);
  }
  if (query.invoiceStatus) {
    where += ' AND i.status=?';
    values.push(query.invoiceStatus);
  }
  const from = `FROM finance_invoices i LEFT JOIN (${bookingProjection}) e ON CAST(e.id AS UNSIGNED)=i.booking_id ${where}`;
  const [counts] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from}`, values);
  const total = Number(counts[0].total);
  if (exportAll && total > 10000) throw new HttpError(422, 'EXPORT_TOO_LARGE');
  const pageSize = exportAll ? 10000 : 50;
  const [invoices] = await pool.execute<(RowDataPacket & FinanceInvoice)[]>(
    `SELECT ${invoiceColumns} ${from} ORDER BY i.id DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, exportAll ? 0 : (query.page - 1) * pageSize],
  );
  return { invoices, total, page: exportAll ? 1 : query.page, pageSize };
}
export async function readFinanceBookingDetail(id: string) {
  const [bookings] = await pool.execute<(RowDataPacket & FinanceBooking)[]>(
    `SELECT e.* FROM (${bookingProjection}) e WHERE e.id=?`,
    [id],
  );
  if (!bookings[0]) throw new HttpError(404, 'NOT_FOUND');
  const [payments] = await pool.execute<(RowDataPacket & FinancePayment)[]>(
    'SELECT CAST(p.id AS CHAR) AS id,p.purpose,p.status,p.amount,p.currency,p.method,p.reference,p.settled_on AS settledOn,u.full_name AS processedBy,p.notes FROM finance_payments p LEFT JOIN users u ON u.id=p.processed_by WHERE p.booking_id=? ORDER BY p.id DESC',
    [id],
  );
  const [invoices] = await pool.execute<(RowDataPacket & FinanceInvoice)[]>(
    `SELECT ${invoiceColumns} FROM finance_invoices i JOIN (${bookingProjection}) e ON CAST(e.id AS UNSIGNED)=i.booking_id WHERE i.booking_id=? ORDER BY i.id DESC`,
    [id],
  );
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.content_json,r.price_json,r.context_json
    FROM travel_bookings b JOIN quotation_revisions r ON r.quotation_id=b.quotation_id AND r.version=b.quotation_version
    WHERE b.finance_id=?`,
    [id],
  );
  const snapshot = rows[0];
  if (!snapshot) return { booking: bookings[0], payments, invoices };
  const content = JSON.parse(snapshot.content_json) as QuotationContent;
  const price = JSON.parse(snapshot.price_json) as QuotationPrice;
  const { customer } = JSON.parse(snapshot.context_json) as Pick<QuotationDocument, 'customer'>;
  const items = [
    {
      description: (content.title.en || content.title.ar).slice(0, 500),
      quantity: '1',
      unitPrice: price.travelersTotal,
    },
    ...(price.addOnTotal !== '0.00'
      ? [
          {
            description: 'Selected trip add-ons / إضافات الرحلة',
            quantity: '1',
            unitPrice: price.addOnTotal,
          },
        ]
      : []),
    ...(price.additionalHotelTotal !== '0.00'
      ? [
          {
            description: 'Hotel and rooms / الفندق والغرف',
            quantity: '1',
            unitPrice: price.additionalHotelTotal,
          },
        ]
      : []),
  ];
  return {
    booking: bookings[0],
    payments,
    invoices,
    invoiceDefaults: { items, email: customer?.email ?? null, phone: customer?.phone ?? null },
  };
}
export async function readFinanceReportGroups(query: FinanceQuery, currency: string) {
  const { where, values } = bookingFilter(query, currency);
  const aggregates = `COUNT(*) AS bookings,SUM(e.totalAmount) AS revenue,
    CASE WHEN COUNT(e.totalCost)=COUNT(*) THEN SUM(e.totalCost) ELSE NULL END AS cost,
    CASE WHEN COUNT(e.totalCost)=COUNT(*) THEN SUM(e.totalAmount-e.totalCost) ELSE NULL END AS profit`;
  const from = `FROM (${bookingProjection}) e ${where} AND e.isReporting=TRUE`;
  const [monthly] = await pool.execute<(RowDataPacket & FinanceReports['monthly'][number])[]>(
    `SELECT DATE_FORMAT(e.bookedAt,'%Y-%m') AS month,${aggregates} ${from} GROUP BY DATE_FORMAT(e.bookedAt,'%Y-%m') ORDER BY month`,
    values,
  );
  const [categories] = await pool.execute<(RowDataPacket & FinanceReports['categories'][number])[]>(
    `SELECT e.category AS name,${aggregates} ${from} GROUP BY e.category ORDER BY e.category`,
    values,
  );
  const [agents] = await pool.execute<(RowDataPacket & FinanceReports['agents'][number])[]>(
    `SELECT e.agentId AS id,e.agent AS name,${aggregates},CASE WHEN COUNT(e.totalCost)=COUNT(*) THEN ROUND(SUM(e.totalAmount-e.totalCost)/NULLIF(SUM(e.totalAmount),0)*100,2) ELSE NULL END AS margin ${from} GROUP BY e.agentId,e.agent ORDER BY e.agent`,
    values,
  );
  return {
    monthly,
    categories: categories.map((row) => ({ ...row, bookings: Number(row.bookings) })),
    agents: agents.map((row) => ({ ...row, bookings: Number(row.bookings) })),
  };
}
