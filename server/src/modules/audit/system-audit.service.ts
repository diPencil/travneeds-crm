import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import {
  auditModules,
  auditSeverities,
  type SystemAuditList,
  type SystemAuditEvent,
} from '../../../../shared/audit/audit.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';

export const systemAuditQuery = z
  .object({
    search: z.string().trim().max(160).default(''),
    module: z.union([z.literal(''), z.enum(auditModules)]).default(''),
    severity: z.union([z.literal(''), z.enum(auditSeverities)]).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
const eventProjection = `SELECT CAST(a.id AS CHAR) AS id, a.actor_id AS actorId, u.full_name AS actorName,
  COALESCE(p.avatar_gender, 'male') AS actorAvatarGender, a.action, a.entity_type AS entityType, a.entity_id AS entityId, a.created_at AS createdAt,
  COALESCE(a.module_code, CASE
    WHEN a.action LIKE 'auth.%' THEN 'authentication'
    WHEN a.action LIKE 'users.%' OR a.action = 'admin.bootstrap' THEN 'users'
    WHEN a.action LIKE 'leads.%' THEN 'leads'
    WHEN a.action LIKE 'customers.%' THEN 'customers'
    WHEN a.action LIKE 'suppliers.%' THEN 'suppliers'
    WHEN a.action LIKE 'settings.%' THEN 'settings'
    WHEN a.action LIKE 'account.%' THEN 'account'
    ELSE 'system' END) AS module,
  a.details, a.request_ip AS requestIp, COALESCE(a.severity, 'info') AS severity, COALESCE(a.outcome,'success') AS outcome
  FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id LEFT JOIN user_profiles p ON p.user_id = a.actor_id`;

export async function readSystemAudit(
  query: z.infer<typeof systemAuditQuery>,
  exportAll = false,
): Promise<SystemAuditList> {
  const conditions: string[] = [];
  const parameters: string[] = [];
  if (query.search) {
    conditions.push(
      "(e.actorName LIKE ? ESCAPE '!' OR e.action LIKE ? ESCAPE '!' OR e.details LIKE ? ESCAPE '!' OR e.entityId LIKE ? ESCAPE '!')",
    );
    const search = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    parameters.push(search, search, search, search);
  }
  if (query.module) {
    conditions.push('e.module = ?');
    parameters.push(query.module);
  }
  if (query.severity) {
    conditions.push('e.severity = ?');
    parameters.push(query.severity);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [counts] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM (${eventProjection}) e ${where}`,
    parameters,
  );
  const total = Number(counts[0].total);
  if (exportAll && total > 10000) throw new HttpError(422, 'EXPORT_TOO_LARGE');
  const size = exportAll ? 10000 : 50;
  const [events] = await pool.execute<(RowDataPacket & SystemAuditEvent)[]>(
    `SELECT * FROM (${eventProjection}) e ${where} ORDER BY CAST(e.id AS UNSIGNED) DESC LIMIT ? OFFSET ?`,
    [...parameters, size, exportAll ? 0 : (query.page - 1) * size],
  );
  return { events, total, page: exportAll ? 1 : query.page, pageSize: size };
}
export async function readUserActivity(id: string) {
  const [events] = await pool.execute<(RowDataPacket & SystemAuditEvent)[]>(
    `${eventProjection} WHERE a.actor_id = ? ORDER BY a.id DESC LIMIT 50`,
    [id],
  );
  return events;
}
