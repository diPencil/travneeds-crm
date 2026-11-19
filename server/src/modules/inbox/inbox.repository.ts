import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  InboxChannel,
  InboxMessage,
  InboxThread,
  IncomingMessagePreview,
} from '../../../../shared/inbox/inbox.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';

const columns = `t.id,t.channel,t.contact_name AS contactName,t.status,t.last_message_at AS lastMessageAt,t.last_inbound_at AS lastInboundAt,
 CAST(s.quotation_id AS CHAR) AS quotationId,CAST(COALESCE(link.customer_id,l.converted_customer_id) AS CHAR) AS customerId,
 CAST(leadLink.lead_id AS CHAR) AS leadId,CAST(link.customer_id AS CHAR) AS directCustomerId,
 (SELECT COUNT(*) FROM inbox_messages m WHERE m.thread_id=t.id AND m.direction='incoming' AND m.read_at IS NULL) AS unread`;
const from = `FROM inbox_threads t LEFT JOIN quotation_shares s ON s.id=t.quotation_share_id
 LEFT JOIN inbox_customer_links link ON link.thread_id=t.id
 LEFT JOIN inbox_lead_links leadLink ON leadLink.thread_id=t.id
 LEFT JOIN leads l ON l.id=leadLink.lead_id`;

export function threadScope(actor: AuthUser) {
  return actor.roles.includes('admin')
    ? { clause: '1=1', values: [] }
    : { clause: 't.owner_id=?', values: [actor.id] };
}

export async function readStaffThread(actor: AuthUser, id: string): Promise<InboxThread> {
  const scope = threadScope(actor);
  const [[thread]] = await pool.execute<(RowDataPacket & InboxThread)[]>(
    `SELECT ${columns} ${from} WHERE t.id=? AND ${scope.clause}`,
    [id, ...scope.values],
  );
  if (!thread) throw new HttpError(404, 'NOT_FOUND');
  return { ...thread, unread: Number(thread.unread) };
}

export async function readRecentIncomingMessages(
  actor: AuthUser,
): Promise<IncomingMessagePreview[]> {
  const scope = threadScope(actor);
  const [rows] = await pool.execute<
    (RowDataPacket & Omit<IncomingMessagePreview, 'unread'> & { unread: number })[]
  >(
    `SELECT CAST(m.id AS CHAR) AS id, t.id AS threadId, t.channel, t.contact_name AS contactName,
     LEFT(m.body, 160) AS preview, m.read_at IS NULL AS unread, m.created_at AS createdAt
     FROM inbox_messages m JOIN inbox_threads t ON m.thread_id=t.id
     WHERE m.direction='incoming' AND ${scope.clause} ORDER BY m.id DESC LIMIT 6`,
    scope.values,
  );
  return rows.map((row) => ({ ...row, unread: Boolean(row.unread) }));
}

export interface ThreadRow extends RowDataPacket {
  id: string;
  channel: InboxChannel;
  account_key: string;
  contact_key: string;
  contact_name: string;
  status: 'open' | 'closed';
  last_inbound_at: string | null;
}
export async function staffThread(
  connection: Pool | PoolConnection,
  actor: AuthUser,
  id: string,
  lock = false,
) {
  const scope = threadScope(actor);
  const [rows] = await connection.execute<ThreadRow[]>(
    `SELECT t.* FROM inbox_threads t WHERE t.id=? AND ${scope.clause} ${lock ? 'FOR UPDATE' : ''}`,
    [id, ...scope.values],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  return rows[0];
}
export async function listThreads(
  actor: AuthUser,
  options: {
    search: string;
    channel?: InboxChannel;
    status?: 'open' | 'closed';
    leadId?: string;
    page: number;
  },
) {
  const { clause: scoped, values: scopeValues } = threadScope(actor);
  const filters = [scoped];
  const values = [...scopeValues];
  if (options.search) {
    filters.push("t.contact_name LIKE ? ESCAPE '!'");
    values.push(`%${options.search.replace(/[!%_]/g, '!$&')}%`);
  }
  if (options.channel) {
    filters.push('t.channel=?');
    values.push(options.channel);
  }
  if (options.status) {
    filters.push('t.status=?');
    values.push(options.status);
  }
  if (options.leadId) {
    filters.push(
      'EXISTS (SELECT 1 FROM inbox_lead_links ll WHERE ll.thread_id=t.id AND ll.lead_id=?)',
    );
    values.push(options.leadId);
  }
  const where = filters.join(' AND ');
  const [[rows], [counts], [stats]] = await Promise.all([
    pool.execute<(RowDataPacket & InboxThread)[]>(
      `SELECT ${columns} ${from} WHERE ${where}
      ORDER BY t.last_message_at DESC,t.id LIMIT 30 OFFSET ?`,
      [...values, (options.page - 1) * 30],
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM inbox_threads t WHERE ${where}`,
      values,
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, SUM(t.status='open') AS open,
      (SELECT COUNT(*) FROM inbox_messages m JOIN inbox_threads t ON t.id=m.thread_id
        WHERE ${scoped} AND m.direction='incoming' AND m.read_at IS NULL) AS unread
      FROM inbox_threads t WHERE ${scoped}`,
      [...scopeValues, ...scopeValues],
    ),
  ]);
  return {
    threads: rows.map((row) => ({ ...row, unread: Number(row.unread) })),
    total: Number(counts[0].total),
    page: options.page,
    pageSize: 30,
    metrics: {
      total: Number(stats[0].total),
      open: Number(stats[0].open),
      unread: Number(stats[0].unread),
    },
  };
}

export async function readMessages(connection: Pool | PoolConnection, id: string, before?: string) {
  const [rows] = await connection.execute<(RowDataPacket & InboxMessage)[]>(
    `SELECT CAST(id AS CHAR) AS id,direction,body,delivery,created_at AS createdAt
     FROM inbox_messages WHERE thread_id=? ${before ? 'AND id<?' : ''} ORDER BY id DESC LIMIT 51`,
    before ? [id, before] : [id],
  );
  return { messages: rows.slice(0, 50).reverse(), hasOlder: rows.length > 50 };
}
