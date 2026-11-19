import type { RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  CustomerFileOverview,
  CustomerFilePage,
  CustomerFileRecords,
  CustomerFileSection,
} from '../../../../shared/crm/customer-file.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { bookingScope } from '../bookings/bookings.repository.js';
import { statusProjection as emailStatus } from '../emails/emails.service.js';
import { threadScope } from '../inbox/inbox.repository.js';
import { actorScope, actualStatus as quoteStatus } from '../quotations/quotations.repository.js';
import { readRecord } from './crm.service.js';

interface Query {
  sql: string;
  values: string[];
}
const pageSize = 25;
const snapshotCustomer = "JSON_UNQUOTE(JSON_EXTRACT(r.context_json,'$.customer.id'))=?";
const quoteRevisions = 'JOIN quotation_revisions r ON r.quotation_id=q.id';
const shareRevisions = `JOIN quotations q ON q.id=s.quotation_id
  ${quoteRevisions} AND r.version=s.quotation_version`;
const financeAccounts =
  "JOIN finance_sources fs ON fs.code=f.source_code AND fs.status='connected'";

function sources(id: string, actor: AuthUser) {
  const admin = actor.roles.includes('admin');
  const quote = actorScope(actor);
  const booking = bookingScope(actor);
  const inbox = threadScope(actor);
  return {
    leads: {
      sql: `FROM leads l WHERE l.converted_customer_id=? ${admin ? '' : 'AND l.archived_at IS NULL'}`,
      values: [id],
    },
    quotations: {
      sql: `FROM quotations q ${quoteRevisions} WHERE ${snapshotCustomer} AND ${quote.sql}`,
      values: [id, ...quote.values],
    },
    bookings: {
      sql: `FROM travel_bookings b JOIN finance_booking_accounts f ON f.id=b.finance_id
        JOIN quotations q ON q.id=b.quotation_id ${quoteRevisions} AND r.version=b.quotation_version
        WHERE b.customer_id=? AND ${booking.clause}`,
      values: [id, ...booking.values],
    },
    inbox: {
      sql: `FROM inbox_threads t JOIN inbox_messages m ON m.thread_id=t.id
        LEFT JOIN quotation_shares s ON s.id=t.quotation_share_id
        LEFT JOIN quotations q ON q.id=s.quotation_id
        LEFT JOIN quotation_revisions r ON r.quotation_id=s.quotation_id AND r.version=s.quotation_version
        LEFT JOIN inbox_customer_links link ON link.thread_id=t.id
        WHERE ((t.channel='web' AND ${snapshotCustomer})
          OR (t.channel<>'web' AND link.customer_id=?)) AND ${inbox.clause}`,
      values: [id, id, ...inbox.values],
    },
    emails: {
      sql: `FROM email_deliveries e JOIN quotation_shares s ON s.id=e.quotation_share_id ${shareRevisions}
        WHERE ${snapshotCustomer} ${admin ? '' : 'AND e.actor_id=?'}`,
      values: admin ? [id] : [id, actor.id],
    },
    payments: {
      sql: `FROM finance_payments p JOIN finance_booking_accounts f ON f.id=p.booking_id
        ${financeAccounts} WHERE f.customer_id=? AND p.purpose IN ('customer_receipt','customer_refund')`,
      values: [id],
    },
    invoices: {
      sql: `FROM finance_invoices i LEFT JOIN finance_booking_accounts f ON f.id=i.booking_id
        LEFT JOIN finance_sources fs ON fs.code=f.source_code AND fs.status='connected'
        LEFT JOIN finance_invoice_customers link ON link.invoice_id=i.id
        WHERE i.party='customer' AND ((f.customer_id=? AND fs.code IS NOT NULL)
          OR (i.booking_id IS NULL AND link.customer_id=?))`,
      values: [id, id],
    },
  } satisfies Record<Exclude<CustomerFileSection, 'timeline'>, Query>;
}

async function fileCustomer(id: string, actor: AuthUser) {
  const customer = await readRecord('customers', id);
  if (customer.archivedAt && !actor.roles.includes('admin')) throw new HttpError(403, 'FORBIDDEN');
  return customer;
}

export async function readCustomerFile(id: string, actor: AuthUser): Promise<CustomerFileOverview> {
  const customer = await fileCustomer(id, actor);
  const source = sources(id, actor);
  const count = async (expression: string, query: Query) => {
    const [[result]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(${expression}) AS total ${query.sql}`,
      query.values,
    );
    return Number(result.total);
  };
  const [quotations, bookings, inbox, emails, finance] = await Promise.all([
    count('DISTINCT q.id', source.quotations),
    count('*', source.bookings),
    count('*', source.inbox),
    count('*', source.emails),
    actor.roles.includes('admin')
      ? pool
          .execute<(RowDataPacket & NonNullable<CustomerFileOverview['finance']>[number])[]>(
            `SELECT p.currency,CAST(SUM(CASE WHEN p.purpose='customer_refund' THEN -p.amount ELSE p.amount END) AS CHAR) AS netReceived
           ${source.payments.sql} AND p.status='verified' GROUP BY p.currency ORDER BY p.currency`,
            source.payments.values,
          )
          .then(([rows]) => rows)
      : null,
  ]);
  return { customer, totals: { quotations, bookings, inbox, emails }, finance };
}

const projection = {
  leads: `CAST(l.id AS CHAR) AS id, l.full_name AS name, l.source, l.status, l.created_at AS createdAt,
    l.archived_at AS archivedAt, (SELECT u.full_name FROM users u WHERE u.id=l.assigned_user_id) AS assignedName,
    (SELECT MIN(a.created_at) FROM audit_events a WHERE a.entity_type='leads'
      AND a.entity_id=CAST(l.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
      AND a.action='leads.converted') AS convertedAt`,
  quotations: `CAST(q.id AS CHAR) AS id, q.reference, r.version, r.created_at AS createdAt,
    JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.title.en')) AS titleEn,
    JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.title.ar')) AS titleAr,
    CASE WHEN r.version=q.current_version THEN ${quoteStatus} END AS status,
    (SELECT COUNT(*) FROM quotation_shares s WHERE s.quotation_id=q.id AND s.quotation_version=r.version) AS sharedLinks,
    (SELECT MAX(COALESCE(e.finished_at,e.created_at)) FROM quotation_shares s JOIN email_deliveries e ON e.quotation_share_id=s.id
      WHERE s.quotation_id=q.id AND s.quotation_version=r.version AND e.status='sent') AS lastSentAt`,
  bookings: `CAST(b.id AS CHAR) AS id, f.booking_reference AS reference, b.created_at AS createdAt,
    CAST(q.id AS CHAR) AS quotationId, q.reference AS quotationReference, b.quotation_version AS quotationVersion,
    b.status, f.currency, CAST(f.total_amount AS CHAR) AS amount,
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.pricing.startDate')),'') AS startDate,
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.content_json,'$.pricing.endDate')),'') AS endDate`,
  payments: `CAST(p.id AS CHAR) AS id, f.booking_reference AS bookingReference, p.currency,
    CAST(p.amount AS CHAR) AS amount, p.purpose, p.status, p.method, p.reference,
    p.settled_on AS settledOn, p.created_at AS createdAt`,
  invoices: `CAST(i.id AS CHAR) AS id, f.booking_reference AS bookingReference, i.invoice_number AS number,
    i.status, i.currency, CAST(i.amount AS CHAR) AS amount, i.due_on AS dueOn, i.created_at AS createdAt`,
  inbox: `CAST(m.id AS CHAR) AS id, t.id AS threadId, t.channel, m.direction, m.body, m.delivery,
    m.created_at AS createdAt`,
  emails: `e.id, q.reference AS quotationReference, s.quotation_version AS quotationVersion,
    e.recipient_email AS recipient, e.subject, ${emailStatus} AS status, e.created_at AS createdAt,
    e.finished_at AS finishedAt`,
} satisfies Record<Exclude<CustomerFileSection, 'timeline'>, string>;

function timeline(id: string, actor: AuthUser, source: ReturnType<typeof sources>): Query {
  const admin = actor.roles.includes('admin');
  const bookings = bookingScope(actor);
  const rows: Query[] = [
    {
      sql: `SELECT CONCAT('audit-',a.id) AS id,a.created_at AS createdAt,
        CASE WHEN a.entity_type='leads' THEN 'lead' ELSE 'customer' END AS category,
        a.action AS event,a.entity_id AS reference,u.full_name AS operator
        FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id
        WHERE (a.entity_type='customers' AND a.entity_id=?)
           OR (a.entity_type='leads' AND a.entity_id IN
             (SELECT CAST(l.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci ${source.leads.sql}))`,
      values: [id, ...source.leads.values],
    },
    {
      sql: `SELECT CONCAT('quote-',q.id,'-',r.version),r.created_at,'quotation',
        'quotations.saved',q.reference,u.full_name
        FROM quotations q ${quoteRevisions} LEFT JOIN users u ON u.id=r.created_by
        WHERE ${snapshotCustomer} AND ${actorScope(actor).sql}`,
      values: source.quotations.values,
    },
    {
      sql: `SELECT CONCAT('share-',s.id),s.created_at,'quotation','link_created',q.reference,u.full_name
        FROM quotation_shares s ${shareRevisions} LEFT JOIN users u ON u.id=s.created_by
        WHERE ${snapshotCustomer} AND ${actorScope(actor).sql}`,
      values: source.quotations.values,
    },
    {
      sql: `SELECT CONCAT('revoked-',s.id),s.revoked_at,'quotation','link_revoked',q.reference,NULL
        FROM quotation_shares s ${shareRevisions}
        WHERE s.revoked_at IS NOT NULL AND ${snapshotCustomer} AND ${actorScope(actor).sql}`,
      values: source.quotations.values,
    },
    {
      sql: `SELECT CONCAT('booking-',a.id),a.created_at,'booking',a.action,f.booking_reference,u.full_name
        FROM travel_bookings b JOIN finance_booking_accounts f ON f.id=b.finance_id
        JOIN audit_events a ON a.entity_type='booking'
          AND a.entity_id=CAST(b.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
        LEFT JOIN users u ON u.id=a.actor_id WHERE b.customer_id=? AND ${bookings.clause}`,
      values: [id, ...bookings.values],
    },
    {
      sql: `SELECT CONCAT('email-',e.id),COALESCE(e.finished_at,e.created_at),'email',${emailStatus},q.reference,NULL ${source.emails.sql}`,
      values: source.emails.values,
    },
    {
      sql: `SELECT CONCAT('message-',m.id),m.created_at,'message',m.direction,q.reference,NULL ${source.inbox.sql}`,
      values: source.inbox.values,
    },
  ];
  if (admin)
    rows.push(
      {
        sql: `SELECT CONCAT('payment-',p.id),p.created_at,'payment',p.purpose,f.booking_reference,NULL ${source.payments.sql}`,
        values: source.payments.values,
      },
      {
        sql: `SELECT CONCAT('invoice-',i.id),i.created_at,'invoice','invoice_recorded',i.invoice_number,NULL ${source.invoices.sql}`,
        values: source.invoices.values,
      },
    );
  return {
    sql: rows.map((row) => row.sql).join(' UNION ALL '),
    values: rows.flatMap((row) => row.values),
  };
}

export async function readCustomerFilePage(
  id: string,
  actor: AuthUser,
  section: CustomerFileSection,
  page: number,
): Promise<CustomerFilePage> {
  const admin = actor.roles.includes('admin');
  if (!admin && (section === 'payments' || section === 'invoices'))
    throw new HttpError(403, 'FORBIDDEN');
  await fileCustomer(id, actor);
  const source = sources(id, actor);
  const query =
    section === 'timeline'
      ? timeline(id, actor, source)
      : {
          sql: `SELECT ${projection[section]} ${source[section].sql}`,
          values: source[section].values,
        };
  const [rows] = await pool.execute<(RowDataPacket & CustomerFileRecords[typeof section])[]>(
    `${query.sql} ORDER BY createdAt DESC,id DESC${section === 'quotations' ? ',version DESC' : ''} LIMIT ? OFFSET ?`,
    [...query.values, pageSize + 1, (page - 1) * pageSize],
  );
  const result = rows.slice(0, pageSize);
  return { section, page, hasMore: rows.length > pageSize, rows: result } as CustomerFilePage;
}
