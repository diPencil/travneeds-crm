import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type { MetaChannel } from '../../../../shared/inbox/inbox.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { readMessages, staffThread } from './inbox.repository.js';
import { prepareMetaReply, type MetaIncoming, type MetaStatus } from './meta-messaging.js';

async function guestShare(
  connection: Pool | PoolConnection,
  shareId: string,
  token: string,
  lock = false,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(404, 'NOT_FOUND');
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT q.created_by,
    JSON_UNQUOTE(JSON_EXTRACT(r.context_json,'$.customer.fullName')) AS customerName
    FROM quotation_shares s JOIN quotations q ON q.id=s.quotation_id
    JOIN quotation_revisions r ON r.quotation_id=q.id AND r.version=s.quotation_version
    WHERE s.id=? AND s.token_digest=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP(6)
    ${lock ? 'FOR UPDATE' : ''}`,
    [shareId, createHash('sha256').update(token).digest('hex')],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  return rows[0];
}
export async function guestHistory(id: string, token: string, before?: string) {
  await guestShare(pool, id, token);
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id,status FROM inbox_threads WHERE quotation_share_id=?',
    [id],
  );
  return rows[0]
    ? { status: rows[0].status, ...(await readMessages(pool, rows[0].id, before)) }
    : { status: 'open', messages: [], hasOlder: false };
}
async function existingRequest(
  connection: PoolConnection,
  key: string,
  threadId: string,
  body: string,
  actorId: string | null,
) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT CAST(id AS CHAR) AS id,thread_id,body,actor_id,delivery FROM inbox_messages WHERE client_key=?',
    [key],
  );
  const message = rows[0];
  if (
    message &&
    (message.thread_id !== threadId || message.body !== body || message.actor_id !== actorId)
  )
    throw new HttpError(409, 'MESSAGE_REQUEST_CONFLICT');
  return message;
}
export async function guestMessage(id: string, token: string, body: string, requestKey: string) {
  await transaction(async (connection) => {
    const share = await guestShare(connection, id, token, true);
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT id,status FROM inbox_threads WHERE quotation_share_id=? FOR UPDATE',
      [id],
    );
    const thread = rows[0];
    const threadId = thread?.id ?? randomUUID();
    if (await existingRequest(connection, requestKey, threadId, body, null)) return;
    if (thread?.status === 'closed') throw new HttpError(409, 'THREAD_CLOSED');
    if (!thread) {
      await connection.execute(
        "INSERT INTO inbox_threads (id,channel,account_key,contact_key,contact_name,quotation_share_id,owner_id) VALUES (?,'web','quotation',?,?,?,?)",
        [threadId, id, share.customerName || 'Customer', id, share.created_by],
      );
    }
    await connection.execute(
      "INSERT INTO inbox_messages (thread_id,direction,body,delivery,client_key) VALUES (?,'incoming',?,'received',?)",
      [threadId, body, requestKey],
    );
    await connection.execute(
      'UPDATE inbox_threads SET last_message_at=UTC_TIMESTAMP(6),last_inbound_at=UTC_TIMESTAMP(6) WHERE id=?',
      [threadId],
    );
  });
  return guestHistory(id, token);
}
export async function setThreadState(
  actor: AuthUser,
  id: string,
  input: { status?: 'open' | 'closed'; readThrough?: string },
) {
  await transaction(async (connection) => {
    const thread = await staffThread(connection, actor, id, true);
    if (input.readThrough) {
      await connection.execute(
        "UPDATE inbox_messages SET read_at=UTC_TIMESTAMP(6) WHERE thread_id=? AND id<=? AND direction='incoming' AND read_at IS NULL",
        [id, input.readThrough],
      );
    }
    if (input.status && input.status !== thread.status) {
      await connection.execute('UPDATE inbox_threads SET status=? WHERE id=?', [input.status, id]);
      await writeAuditEvent(connection, {
        actorId: actor.id,
        action: `inbox.${input.status}`,
        entityType: 'conversation',
        entityId: id,
        module: 'inbox',
      });
    }
  });
}
export async function staffReply(actor: AuthUser, id: string, body: string, requestKey: string) {
  const prepared = await transaction(async (connection) => {
    const thread = await staffThread(connection, actor, id, true);
    const existing = await existingRequest(connection, requestKey, id, body, actor.id);
    if (existing)
      return { id: String(existing.id), delivery: String(existing.delivery), send: null };
    if (thread.status === 'closed') throw new HttpError(409, 'THREAD_CLOSED');
    let send: Awaited<ReturnType<typeof prepareMetaReply>> | null = null;
    if (thread.channel !== 'web') {
      const lastInbound = thread.last_inbound_at
        ? Date.parse(thread.last_inbound_at.replace(' ', 'T') + 'Z')
        : NaN;
      if (!Number.isFinite(lastInbound) || Date.now() - lastInbound >= 24 * 60 * 60 * 1000)
        throw new HttpError(409, 'MESSAGE_WINDOW_CLOSED');
      if (body.length > 1000) throw new HttpError(400, 'MESSAGE_TOO_LONG_FOR_CHANNEL');
      send = await prepareMetaReply(thread.channel, thread.account_key, thread.contact_key, body);
    }
    const delivery = send ? 'sending' : 'sent';
    const [message] = await connection.execute<ResultSetHeader>(
      "INSERT INTO inbox_messages (thread_id,actor_id,direction,body,delivery,client_key) VALUES (?,?,'outgoing',?,?,?)",
      [id, actor.id, body, delivery, requestKey],
    );
    await connection.execute(
      'UPDATE inbox_threads SET last_message_at=UTC_TIMESTAMP(6) WHERE id=?',
      [id],
    );
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: 'inbox.reply_created',
      entityType: 'conversation',
      entityId: id,
      module: 'inbox',
    });
    return { id: String(message.insertId), delivery, send };
  });
  if (!prepared.send) return { id: prepared.id, delivery: prepared.delivery };
  const result = await prepared.send();
  await pool.execute(
    'UPDATE inbox_messages SET delivery=?,provider_key=? WHERE id=? AND delivery=?',
    [result.delivery, 'key' in result ? result.key : null, prepared.id, 'sending'],
  );
  return { id: prepared.id, delivery: result.delivery };
}
export async function receiveMeta(
  channel: MetaChannel,
  account: string,
  messages: MetaIncoming[],
  statuses: MetaStatus[],
) {
  for (const message of messages) {
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO inbox_threads (id,channel,account_key,contact_key,contact_name)
        VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
        [randomUUID(), channel, account, message.contact, message.name],
      );
      const [threads] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM inbox_threads WHERE channel=? AND account_key=? AND contact_key=? FOR UPDATE',
        [channel, account, message.contact],
      );
      const id = threads[0].id as string;
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM inbox_messages WHERE thread_id=? AND provider_key=?',
        [id, message.key],
      );
      if (existing.length) return;
      const now = new Date();
      const receivedAt = message.sentAt.getTime() > now.getTime() ? now : message.sentAt;
      if (!Number.isFinite(receivedAt.getTime()) || receivedAt.getUTCFullYear() < 2000) return;
      await connection.execute(
        `INSERT INTO inbox_messages (thread_id,direction,body,delivery,provider_key,created_at)
        VALUES (?,'incoming',?,'received',?,?)`,
        [id, message.body, message.key, receivedAt],
      );
      await connection.execute(
        `UPDATE inbox_threads SET status='open',contact_name=?,
        last_message_at=GREATEST(last_message_at,?),last_inbound_at=GREATEST(COALESCE(last_inbound_at,?),?) WHERE id=?`,
        [message.name, receivedAt, receivedAt, receivedAt, id],
      );
    });
  }
  for (const entry of statuses) {
    await pool.execute(
      `UPDATE inbox_messages m JOIN inbox_threads t ON t.id=m.thread_id
      SET m.delivery=? WHERE t.channel=? AND t.account_key=? AND t.contact_key=? AND m.provider_key=?
      AND m.direction='outgoing' AND (m.delivery='sent' OR (m.delivery='delivered' AND ?='read'))`,
      [entry.status, channel, account, entry.contact, entry.key, entry.status],
    );
  }
}
