import type { RowDataPacket } from 'mysql2/promise';
import type { UserDetail, PersonalInformation } from '../../../../shared/users/users.contracts.js';
import { userPermissionCodes } from '../../../../shared/auth/permissions.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { readManagedUsers } from './users.service.js';
import { readUserActivity } from '../audit/system-audit.service.js';
import { writeAuditEvent } from '../audit/audit.repository.js';

export async function readUserDetails(id: string, currentSessionHash: string): Promise<UserDetail> {
  const user = (await readManagedUsers(id))[0];
  if (!user) throw new HttpError(404, 'NOT_FOUND');
  const [profiles] = await pool.execute<(RowDataPacket & PersonalInformation)[]>(
    'SELECT date_of_birth AS dateOfBirth,nationality,gender,address,emergency_contact_name AS emergencyContactName,emergency_contact_phone AS emergencyContactPhone,emergency_relationship AS emergencyRelationship FROM user_profiles WHERE user_id = ?',
    [id],
  );
  const [sessions] = await pool.execute<RowDataPacket[]>(
    'SELECT created_at AS createdAt,expires_at AS expiresAt,user_agent AS userAgent,token_hash = ? AS isCurrent FROM auth_sessions WHERE user_id = ? AND expires_at > UTC_TIMESTAMP(6) ORDER BY created_at DESC',
    [currentSessionHash, id],
  );
  const [counts] = await pool.execute<RowDataPacket[]>(
    `SELECT
    (SELECT COUNT(*) FROM leads WHERE assigned_user_id = ? AND archived_at IS NULL) AS assignedLeads,
    (SELECT COUNT(*) FROM leads WHERE assigned_user_id = ? AND archived_at IS NULL AND converted_customer_id IS NOT NULL) AS convertedLeads,
    (SELECT COUNT(*) FROM customers WHERE assigned_user_id = ? AND archived_at IS NULL) AS assignedCustomers,
    (SELECT COUNT(*) FROM audit_events WHERE actor_id = ?) AS recordedEvents`,
    [id, id, id, id],
  );
  return {
    user,
    personal: profiles[0] ?? {
      dateOfBirth: null,
      nationality: null,
      gender: 'unspecified',
      address: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyRelationship: null,
    },
    security: {
      twoFactorEnabled: false,
      sessions: sessions.map((row) => ({
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        userAgent: row.userAgent,
        isCurrent: Boolean(row.isCurrent),
      })),
    },
    permissions: userPermissionCodes(user.roles),
    activity: await readUserActivity(id),
    performance: {
      assignedLeads: Number(counts[0].assignedLeads),
      convertedLeads: Number(counts[0].convertedLeads),
      assignedCustomers: Number(counts[0].assignedCustomers),
      recordedEvents: Number(counts[0].recordedEvents),
    },
  };
}
export async function revokeUserSessions(
  id: string,
  actor: string,
  keepCurrent: boolean,
  currentSessionHash: string,
) {
  if (id === actor && !keepCurrent) throw new HttpError(409, 'CANNOT_REVOKE_SELF');
  if (keepCurrent && id !== actor) throw new HttpError(400, 'INVALID_INPUT');
  await transaction(async (connection) => {
    const [users] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [id],
    );
    if (!users.length) throw new HttpError(404, 'NOT_FOUND');
    await connection.execute(
      `DELETE FROM auth_sessions WHERE user_id = ? ${keepCurrent ? 'AND token_hash <> ?' : ''}`,
      keepCurrent ? [id, currentSessionHash] : [id],
    );
    await writeAuditEvent(connection, {
      actorId: actor,
      action: 'users.sessions_revoked',
      entityType: 'user',
      entityId: id,
      module: 'users',
      severity: 'critical',
      details: keepCurrent
        ? 'Other account sessions revoked; current session retained'
        : 'Account sessions revoked',
    });
  });
}
export async function messageUser(id: string, actor: string, message: string) {
  await transaction(async (connection) => {
    const [users] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ? AND status = 'active' FOR UPDATE",
      [id],
    );
    if (!users.length) throw new HttpError(404, 'NOT_FOUND');
    const [senders] = await connection.execute<RowDataPacket[]>(
      'SELECT full_name FROM users WHERE id = ?',
      [actor],
    );
    await connection.execute(
      "INSERT INTO notifications (user_id,type,sender_name,message,href) VALUES (?, 'mention', ?, ?, '/notifications')",
      [id, senders[0].full_name, message],
    );
    await writeAuditEvent(connection, {
      actorId: actor,
      action: 'users.message_sent',
      entityType: 'user',
      entityId: id,
      module: 'users',
      details: 'Internal notification sent to account',
    });
  });
}
