import type { PoolConnection } from 'mysql2/promise';
import type { SystemAuditEvent } from '../../../../shared/audit/audit.contracts.js';

interface AuditWrite {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  module: SystemAuditEvent['module'];
  details?: string;
  severity?: SystemAuditEvent['severity'];
  outcome?: SystemAuditEvent['outcome'];
  requestIp?: string | null;
}
export async function writeAuditEvent(
  connection: Pick<PoolConnection, 'execute'>,
  entry: AuditWrite,
) {
  await connection.execute(
    `INSERT INTO audit_events (actor_id,action,entity_type,entity_id,module_code,details,severity,outcome,request_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorId,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.module,
      entry.details ?? null,
      entry.severity ?? 'info',
      entry.outcome ?? 'success',
      entry.requestIp ?? null,
    ],
  );
}
