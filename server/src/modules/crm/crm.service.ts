import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { z } from 'zod';
import type { CrmKind, CrmDirectory, CrmRecord } from '../../../../shared/crm/crm.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { customerInput, leadInput, supplierInput, listInput } from './crm.validation.js';

// SQL identifiers are exclusively defined here, never supplied by a request.
const commonColumns = {
  fullName: 'full_name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  notes: 'notes',
  status: 'status',
};
const modules = {
  leads: {
    table: 'leads',
    schema: leadInput,
    columns: {
      ...commonColumns,
      type: 'type',
      source: 'source',
      priority: 'priority',
      valueAmount: 'value_amount',
      currency: 'currency',
      assignedUserId: 'assigned_user_id',
      nextFollowUpAt: 'next_follow_up_at',
    },
  },
  customers: {
    table: 'customers',
    schema: customerInput,
    columns: {
      ...commonColumns,
      type: 'type',
      nationality: 'nationality',
      assignedUserId: 'assigned_user_id',
    },
  },
  suppliers: {
    table: 'suppliers',
    schema: supplierInput,
    columns: {
      ...commonColumns,
      category: 'category',
      contactName: 'contact_name',
      country: 'country',
      city: 'city',
    },
  },
};
export const crmKinds = Object.keys(modules) as CrmKind[];
export function parseRecord(kind: CrmKind, body: unknown) {
  return modules[kind].schema.parse(body);
}
type RecordInput = ReturnType<typeof parseRecord>;

function selectColumns(kind: CrmKind) {
  const fields = Object.entries(modules[kind].columns).map(
    ([alias, column]) => `r.${column} AS ${alias}`,
  );
  return `CAST(r.id AS CHAR) AS id, ${fields.join(', ')}, r.version, r.created_at AS createdAt, r.updated_at AS updatedAt, r.archived_at AS archivedAt${kind === 'leads' ? ', CAST(r.converted_customer_id AS CHAR) AS convertedCustomerId' : ''}${kind !== 'suppliers' ? ', u.full_name AS assignedName' : ''}`;
}
function joinAssignee(kind: CrmKind) {
  return kind !== 'suppliers' ? 'LEFT JOIN users u ON u.id = r.assigned_user_id' : '';
}
export async function readRecord(kind: CrmKind, id: string) {
  const [rows] = await pool.execute<(RowDataPacket & CrmRecord)[]>(
    `SELECT ${selectColumns(kind)} FROM ${modules[kind].table} r ${joinAssignee(kind)} WHERE r.id = ?`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  return rows[0];
}

export async function listRecords(
  kind: CrmKind,
  query: z.infer<typeof listInput>,
  actor: AuthUser,
): Promise<CrmDirectory> {
  const conditions = [`r.archived_at IS ${query.archived === 'true' ? 'NOT ' : ''}NULL`];
  const values: (string | number)[] = [];
  if (query.search) {
    conditions.push(
      "(r.full_name LIKE ? ESCAPE '!' OR r.email LIKE ? ESCAPE '!' OR r.phone LIKE ? ESCAPE '!')",
    );
    const pattern = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    values.push(pattern, pattern, pattern);
  }
  if (query.status) {
    conditions.push('r.status = ?');
    values.push(query.status);
  }
  if (query.type && kind !== 'suppliers') {
    conditions.push('r.type = ?');
    values.push(query.type);
  }
  if (query.source && kind === 'leads') {
    conditions.push('r.source = ?');
    values.push(query.source);
  }
  if (query.agent && kind !== 'suppliers') {
    conditions.push('r.assigned_user_id = ?');
    values.push(query.agent);
  }
  if (query.overdue === 'true' && kind === 'leads')
    conditions.push(
      "r.next_follow_up_at < UTC_TIMESTAMP(6) AND r.status NOT IN ('Closed Won', 'Closed Lost') AND r.converted_customer_id IS NULL",
    );
  const where = conditions.join(' AND ');
  const [counts] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${modules[kind].table} r WHERE ${where}`,
    values,
  );
  const [records] = await pool.execute<RowDataPacket[]>(
    `SELECT ${selectColumns(kind)} FROM ${modules[kind].table} r ${joinAssignee(kind)} WHERE ${where} ORDER BY r.id DESC LIMIT 50 OFFSET ?`,
    [...values, (query.page - 1) * 50],
  );
  if (kind === 'customers' && records.length) {
    const scope = actor.roles.includes('admin') ? [] : [actor.id];
    const ids = records.map((record) => String(record.id));
    const [bookings] = await pool.execute<RowDataPacket[]>(
      `SELECT CAST(customer_id AS CHAR) AS customerId,COUNT(*) AS total
      FROM travel_bookings WHERE customer_id IN (${ids.map(() => '?').join(',')})
      AND status IN ('confirmed','completed') ${scope.length ? 'AND owner_id=?' : ''} GROUP BY customer_id`,
      [...ids, ...scope],
    );
    const countsByCustomer = new Map(bookings.map((row) => [row.customerId, Number(row.total)]));
    for (const record of records) record.bookingCount = countsByCustomer.get(record.id) ?? 0;
  }
  const metricSql =
    kind === 'leads'
      ? "COUNT(*) AS total, COALESCE(SUM(created_at >= UTC_DATE()),0) AS newToday, COALESCE(SUM(status = 'Qualified'),0) AS qualified, COALESCE(SUM(converted_customer_id IS NOT NULL),0) AS converted"
      : kind === 'customers'
        ? "COUNT(*) AS total, COALESCE(SUM(status IN ('Active', 'VIP', 'Recurring')),0) AS active, COALESCE(SUM(status = 'VIP'),0) AS vip"
        : "COUNT(*) AS total, COALESCE(SUM(status = 'Active'),0) AS active, COUNT(DISTINCT category) AS categories";
  const [metricRows] = await pool.query<RowDataPacket[]>(
    `SELECT ${metricSql} FROM ${modules[kind].table} WHERE archived_at IS NULL`,
  );
  return {
    records: records as CrmDirectory['records'],
    total: Number(counts[0].total),
    page: query.page,
    pageSize: 50,
    metrics: Object.fromEntries(
      Object.entries(metricRows[0]).map(([key, value]) => [key, Number(value)]),
    ),
  };
}

async function assertAssignee(connection: PoolConnection, input: RecordInput) {
  if (!('assignedUserId' in input) || !input.assignedUserId) return;
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE id = ? AND status = 'active' FOR UPDATE",
    [input.assignedUserId],
  );
  if (!rows.length) throw new HttpError(400, 'INVALID_ASSIGNEE');
}
async function audit(
  connection: PoolConnection,
  actor: string,
  kind: CrmKind,
  id: string,
  action: string,
) {
  await connection.execute(
    'INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
    [actor, `${kind}.${action}`, kind, id],
  );
}
function persistedValue(key: string, value: string): string | null {
  if (key === 'nextFollowUpAt' && value)
    return new Date(String(value)).toISOString().slice(0, 23).replace('T', ' ');
  return value === '' ? null : value;
}
async function handleConflict<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY')
      throw new HttpError(409, 'EMAIL_IN_USE');
    throw error;
  }
}
export async function saveRecord(
  kind: CrmKind,
  input: RecordInput,
  actor: string,
  id?: string,
  version?: number,
) {
  return handleConflict(() =>
    transaction(async (connection) => {
      let previousAssignee: string | null = null;
      if (id) {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT version,archived_at${kind !== 'suppliers' ? ', assigned_user_id' : ''} FROM ${modules[kind].table} WHERE id = ? FOR UPDATE`,
          [id],
        );
        if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
        if (Number(rows[0].version) !== version) throw new HttpError(409, 'VERSION_CONFLICT');
        if (rows[0].archived_at) throw new HttpError(409, 'RECORD_ARCHIVED');
        previousAssignee = rows[0].assigned_user_id ?? null;
      }
      await assertAssignee(connection, input);
      const entries = Object.entries(modules[kind].columns);
      const values = entries.map(([key]) => persistedValue(key, input[key as keyof RecordInput]));
      if (id) {
        await connection.execute(
          `UPDATE ${modules[kind].table} SET ${entries.map(([, column]) => `${column} = ?`).join(', ')}, version = version + 1 WHERE id = ?`,
          [...values, id],
        );
      } else {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO ${modules[kind].table} (${entries.map(([, column]) => column).join(', ')}, created_by) VALUES (${entries.map(() => '?').join(', ')}, ?)`,
          [...values, actor],
        );
        id = String(result.insertId);
      }
      await audit(connection, actor, kind, id, 'saved');
      if (
        'assignedUserId' in input &&
        input.assignedUserId &&
        input.assignedUserId !== previousAssignee
      ) {
        const [actors] = await connection.execute<RowDataPacket[]>(
          'SELECT full_name FROM users WHERE id = ?',
          [actor],
        );
        await connection.execute(
          "INSERT INTO notifications (user_id, type, sender_name, message, href) VALUES (?, 'system', ?, ?, ?)",
          [
            input.assignedUserId,
            actors[0].full_name,
            `Assigned ${kind === 'leads' ? 'lead' : 'customer'}: ${input.fullName}`,
            `/${kind}/${id}`,
          ],
        );
      }
      return { id };
    }),
  );
}
export async function archiveRecord(
  kind: CrmKind,
  id: string,
  version: number,
  archived: boolean,
  actor: string,
) {
  await transaction(async (connection) => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT version FROM ${modules[kind].table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
    if (Number(rows[0].version) !== version) throw new HttpError(409, 'VERSION_CONFLICT');
    await connection.execute(
      `UPDATE ${modules[kind].table} SET archived_at = ${archived ? 'UTC_TIMESTAMP(6)' : 'NULL'}, version = version + 1 WHERE id = ?`,
      [id],
    );
    await audit(connection, actor, kind, id, archived ? 'archived' : 'restored');
  });
}
export async function convertLead(id: string, version: number, actor: string, customerId?: string) {
  return handleConflict(() =>
    transaction(async (connection) => {
      const [leads] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM leads WHERE id = ? FOR UPDATE',
        [id],
      );
      const lead = leads[0];
      if (!lead) throw new HttpError(404, 'NOT_FOUND');
      if (lead.archived_at) throw new HttpError(409, 'RECORD_ARCHIVED');
      if (lead.converted_customer_id) return { customerId: String(lead.converted_customer_id) };
      if (Number(lead.version) !== version) throw new HttpError(409, 'VERSION_CONFLICT');
      if (customerId) {
        const [customers] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM customers WHERE id = ? AND archived_at IS NULL FOR UPDATE',
          [customerId],
        );
        if (!customers[0]) throw new HttpError(404, 'NOT_FOUND');
      } else {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO customers (full_name,email,phone,company,type,status,assigned_user_id,notes,created_by)
        VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?)`,
          [
            lead.full_name,
            lead.email,
            lead.phone,
            lead.company,
            lead.type === 'B2B' ? 'Corporate' : 'Individual',
            lead.assigned_user_id,
            lead.notes,
            actor,
          ],
        );
        customerId = String(result.insertId);
        await audit(connection, actor, 'customers', customerId, 'created_from_lead');
      }
      await connection.execute(
        'UPDATE leads SET converted_customer_id = ?, version = version + 1 WHERE id = ?',
        [customerId, id],
      );
      await audit(connection, actor, 'leads', id, 'converted');
      return { customerId };
    }),
  );
}
