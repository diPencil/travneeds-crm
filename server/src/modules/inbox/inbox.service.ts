import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type { MetaChannel } from '../../../../shared/inbox/inbox.contracts.js';
import type { LeadSource } from '../../../../shared/crm/crm.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { createInboxLead } from '../crm/crm.service.js';
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

export async function linkInboxCustomer(
  actor: AuthUser,
  id: string,
  input: { customerId: string | null; previousCustomerId: string | null },
) {
  await transaction(async (connection) => {
    const thread = await staffThread(connection, actor, id, true);
    if (thread.channel === 'web') throw new HttpError(409, 'QUOTATION_THREAD_CUSTOMER_FIXED');
    const [[link]] = await connection.execute<RowDataPacket[]>(
      'SELECT CAST(customer_id AS CHAR) AS customerId FROM inbox_customer_links WHERE thread_id=?',
      [id],
    );
    const current = link?.customerId ?? null;
    if (current === input.customerId) return;
    if (current !== input.previousCustomerId) throw new HttpError(409, 'RECORD_CHANGED');
    if (input.customerId === null) {
      await connection.execute('DELETE FROM inbox_customer_links WHERE thread_id=?', [id]);
    } else {
      const [[customer]] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM customers WHERE id=? AND archived_at IS NULL FOR UPDATE',
        [input.customerId],
      );
      if (!customer) throw new HttpError(404, 'NOT_FOUND');
      await connection.execute(
        'INSERT INTO inbox_customer_links (thread_id,customer_id) VALUES (?,?) ON DUPLICATE KEY UPDATE customer_id=VALUES(customer_id)',
        [id, input.customerId],
      );
    }
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: input.customerId ? 'inbox.customer_linked' : 'inbox.customer_unlinked',
      entityType: 'conversation',
      entityId: id,
      module: 'inbox',
    });
  });
}

const sourcesByChannel = {
  messenger: 'Facebook Messenger',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
} satisfies Record<MetaChannel, LeadSource>;

async function readThreadLinks(connection: PoolConnection, threadId: string) {
  const [[links]] = await connection.execute<
    (RowDataPacket & { leadId: string | null; customerId: string | null })[]
  >(
    `SELECT CAST(l.lead_id AS CHAR) AS leadId, CAST(c.customer_id AS CHAR) AS customerId
     FROM inbox_threads t
     LEFT JOIN inbox_lead_links l ON l.thread_id=t.id
     LEFT JOIN inbox_customer_links c ON c.thread_id=t.id
     WHERE t.id=?`,
    [threadId],
  );
  return links;
}

async function createThreadLead(
  connection: PoolConnection,
  thread: { id: string; channel: MetaChannel; contactKey: string; contactName: string },
  actorId: string | null,
) {
  const { id, channel, contactKey, contactName } = thread;
  const leadId = await createInboxLead(
    connection,
    {
      fullName: Array.from(contactName.trim() || contactKey)
        .slice(0, 160)
        .join(''),
      phone: channel === 'whatsapp' && /^[1-9]\d{6,14}$/.test(contactKey) ? `+${contactKey}` : null,
      source: sourcesByChannel[channel],
    },
    actorId,
  );
  await connection.execute('INSERT INTO inbox_lead_links (thread_id,lead_id) VALUES (?,?)', [
    id,
    leadId,
  ]);
  return leadId;
}

export async function linkInboxLead(
  actor: AuthUser,
  id: string,
  input: { leadId: string | null; previousLeadId: string | null },
) {
  return transaction(async (connection) => {
    const thread = await staffThread(connection, actor, id, true);
    if (thread.channel === 'web') throw new HttpError(409, 'QUOTATION_THREAD_LEAD_DISABLED');
    const links = await readThreadLinks(connection, id);
    if (links.leadId && (input.leadId === links.leadId || input.leadId === null))
      return { leadId: links.leadId };
    if (links.customerId) throw new HttpError(409, 'CONVERSATION_HAS_CUSTOMER');
    if (input.previousLeadId !== links.leadId) throw new HttpError(409, 'RECORD_CHANGED');
    if (input.leadId === null) {
      const leadId = await createThreadLead(
        connection,
        {
          id,
          channel: thread.channel,
          contactKey: thread.contact_key,
          contactName: thread.contact_name,
        },
        actor.id,
      );
      return { leadId };
    }
    const [[lead]] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM leads WHERE id=? AND archived_at IS NULL FOR UPDATE',
      [input.leadId],
    );
    if (!lead) throw new HttpError(404, 'NOT_FOUND');
    await connection.execute(
      `INSERT INTO inbox_lead_links (thread_id,lead_id) VALUES (?,?)
       ON DUPLICATE KEY UPDATE lead_id=VALUES(lead_id)`,
      [id, input.leadId],
    );
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: 'inbox.lead_linked',
      entityType: 'conversation',
      entityId: id,
      module: 'inbox',
    });
    return { leadId: input.leadId };
  });
}

export async function receiveMeta(
  channel: MetaChannel,
  account: string,
  messages: MetaIncoming[],
  statuses: MetaStatus[],
) {
  for (const message of messages) {
    const now = new Date();
    const receivedAt = message.sentAt.getTime() > now.getTime() ? now : message.sentAt;
    if (!Number.isFinite(receivedAt.getTime()) || receivedAt.getUTCFullYear() < 2000) continue;
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
      const links = await readThreadLinks(connection, id);
      if (!links.leadId && !links.customerId) {
        await createThreadLead(
          connection,
          { id, channel, contactKey: message.contact, contactName: message.name },
          null,
        );
      }
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
