import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { z } from 'zod';
import type { ManagedUser, UserDirectory } from '../../../../shared/users/users.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { hashPassword } from '../auth/passwords.js';
import { tokenHash } from '../auth/auth.service.js';
import {
  createUserInput,
  updateUserInput,
  inviteInput,
  userDetailsInput,
} from './users.validation.js';
import { writeAuditEvent } from '../audit/audit.repository.js';

export async function recordUserEvent(
  connection: PoolConnection,
  actor: string,
  action: string,
  id: string,
) {
  await writeAuditEvent(connection, {
    actorId: actor,
    action,
    entityType: 'user',
    entityId: id,
    module: 'users',
  });
}

async function uniqueEmail<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY')
      throw new HttpError(409, 'EMAIL_IN_USE');
    throw error;
  }
}

export async function readManagedUsers(id?: string): Promise<ManagedUser[]> {
  const [rows] = await pool.execute<
    (RowDataPacket & Omit<ManagedUser, 'roles'> & { roleCodes: string })[]
  >(
    `SELECT u.id, u.full_name AS fullName, u.email, u.status, u.version, u.created_at AS createdAt,
    COALESCE(u.last_login_at, (SELECT MAX(created_at) FROM audit_events WHERE actor_id = u.id AND action = 'auth.login')) AS lastLoginAt, p.phone, p.department, p.job_title AS jobTitle, COALESCE(p.avatar_gender, 'male') AS avatarGender,
    COALESCE(p.version, 0) AS profileVersion,
    (SELECT GROUP_CONCAT(role_code ORDER BY role_code) FROM user_roles WHERE user_id = u.id) AS roleCodes,
    (SELECT COUNT(*) FROM auth_sessions WHERE user_id = u.id AND expires_at > UTC_TIMESTAMP(6)) AS activeSessions
    FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id ${id ? 'WHERE u.id = ?' : ''} ORDER BY u.created_at DESC`,
    id ? [id] : [],
  );
  const users: ManagedUser[] = rows.map((row) => ({
    ...row,
    roles: String(row.roleCodes ?? '')
      .split(',')
      .filter((role): role is 'admin' | 'employee' => role === 'admin' || role === 'employee'),
    activeSessions: Number(row.activeSessions),
    roleCodes: undefined,
  }));
  return users;
}
export async function listUsers(): Promise<UserDirectory> {
  const users = await readManagedUsers();
  const [pending] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM user_invitations WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6)',
  );
  return {
    users,
    metrics: {
      total: users.length,
      activeSessions: users
        .filter((user) => user.status === 'active')
        .reduce((sum, user) => sum + user.activeSessions, 0),
      admins: users.filter((user) => user.status === 'active' && user.roles.includes('admin'))
        .length,
      pendingInvites: Number(pending[0].total),
    },
  };
}

async function savePersonalFields(
  connection: PoolConnection,
  id: string,
  input: z.infer<typeof userDetailsInput>,
) {
  const columns = {
    dateOfBirth: 'date_of_birth',
    nationality: 'nationality',
    gender: 'gender',
    address: 'address',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
    emergencyRelationship: 'emergency_relationship',
  } as const;
  const provided = (Object.keys(columns) as (keyof typeof columns)[]).filter(
    (key) => input[key] !== undefined,
  );
  if (!provided.length) return;
  await connection.execute(
    `UPDATE user_profiles SET ${provided.map((key) => `${columns[key]} = ?`).join(', ')} WHERE user_id = ?`,
    [...provided.map((key) => input[key] || null), id],
  );
}

export async function createUser(input: z.infer<typeof createUserInput>, actor: string) {
  const passwordHash = await hashPassword(input.password);
  const id = randomUUID();
  await uniqueEmail(() =>
    transaction(async (connection) => {
      await connection.execute(
        'INSERT INTO users (id, email, full_name, password_hash, status) VALUES (?, ?, ?, ?, ?)',
        [id, input.email, input.fullName, passwordHash, input.status],
      );
      await connection.execute('INSERT INTO user_roles (user_id, role_code) VALUES (?, ?)', [
        id,
        input.role,
      ]);
      await connection.execute(
        'INSERT INTO user_profiles (user_id, phone, department, job_title, avatar_gender) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          input.phone || null,
          input.department || null,
          input.jobTitle || null,
          input.avatarGender,
        ],
      );
      await recordUserEvent(connection, actor, 'users.created', id);
      await savePersonalFields(connection, id, input);
    }),
  );
  return { id };
}

export async function updateUser(
  id: string,
  input: z.infer<typeof updateUserInput>,
  actor: string,
) {
  if (id === actor && (input.status !== 'active' || input.role !== 'admin'))
    throw new HttpError(409, 'CANNOT_REVOKE_SELF');
  await uniqueEmail(() =>
    transaction(async (connection) => {
      // Serialize administrative mutations to protect the last active administrator.
      await connection.execute('SELECT id FROM project_settings WHERE id = 1 FOR UPDATE');
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT version, status FROM users WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
      if (Number(rows[0].version) !== input.version) throw new HttpError(409, 'VERSION_CONFLICT');
      const [admins] = await connection.query<RowDataPacket[]>(
        "SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role_code = 'admin' AND u.status = 'active'",
      );
      if (
        admins.some((row) => row.id === id) &&
        admins.length === 1 &&
        (input.role !== 'admin' || input.status !== 'active')
      )
        throw new HttpError(409, 'LAST_ADMIN');
      const [roles] = await connection.execute<RowDataPacket[]>(
        'SELECT role_code FROM user_roles WHERE user_id = ?',
        [id],
      );
      const roleChanged = roles.length !== 1 || roles[0].role_code !== input.role;
      await connection.execute(
        'UPDATE users SET full_name = ?, email = ?, status = ?, version = version + 1 WHERE id = ?',
        [input.fullName, input.email, input.status, id],
      );
      await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
      await connection.execute('INSERT INTO user_roles (user_id, role_code) VALUES (?, ?)', [
        id,
        input.role,
      ]);
      await connection.execute(
        `INSERT INTO user_profiles (user_id, phone, department, job_title, avatar_gender) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE phone = VALUES(phone), department = VALUES(department), job_title = VALUES(job_title), avatar_gender = VALUES(avatar_gender), version = version + 1`,
        [
          id,
          input.phone || null,
          input.department || null,
          input.jobTitle || null,
          input.avatarGender,
        ],
      );
      if (input.status === 'disabled' || roleChanged)
        await connection.execute('DELETE FROM auth_sessions WHERE user_id = ?', [id]);
      await savePersonalFields(connection, id, input);
      await writeAuditEvent(connection, {
        actorId: actor,
        action: 'users.updated',
        entityType: 'user',
        entityId: id,
        module: 'users',
        severity: roleChanged || rows[0].status !== input.status ? 'critical' : 'info',
        details: roleChanged
          ? 'Account role changed'
          : rows[0].status !== input.status
            ? 'Account status changed'
            : 'Account details updated',
      });
    }),
  );
}

export async function createInvitation(input: z.infer<typeof inviteInput>, actor: string) {
  const id = randomUUID();
  const token = randomBytes(32).toString('hex');
  await transaction(async (connection) => {
    await connection.execute('SELECT id FROM project_settings WHERE id = 1 FOR UPDATE');
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [input.email],
    );
    if (existing.length) throw new HttpError(409, 'EMAIL_IN_USE');
    await connection.execute(
      'UPDATE user_invitations SET revoked_at = UTC_TIMESTAMP(6) WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL',
      [input.email],
    );
    await connection.execute(
      `INSERT INTO user_invitations (id, email, full_name, role_code, avatar_gender, token_hash, invited_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 72 HOUR))`,
      [id, input.email, input.fullName, input.role, input.avatarGender, tokenHash(token), actor],
    );
    await recordUserEvent(connection, actor, 'users.invited', id);
  });
  return { id, token };
}

export async function readInvitation(token: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT full_name AS fullName, expires_at AS expiresAt FROM user_invitations
    WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6)`,
    [tokenHash(token)],
  );
  if (!rows[0]) throw new HttpError(410, 'INVITATION_UNAVAILABLE');
  return rows[0];
}

export async function acceptInvitation(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  await uniqueEmail(() =>
    transaction(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM user_invitations WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6) FOR UPDATE`,
        [tokenHash(token)],
      );
      const invitation = rows[0];
      if (!invitation) throw new HttpError(410, 'INVITATION_UNAVAILABLE');
      const id = randomUUID();
      await connection.execute(
        'INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)',
        [id, invitation.email, invitation.full_name, passwordHash],
      );
      await connection.execute('INSERT INTO user_roles (user_id, role_code) VALUES (?, ?)', [
        id,
        invitation.role_code,
      ]);
      await connection.execute('INSERT INTO user_profiles (user_id, avatar_gender) VALUES (?, ?)', [
        id,
        invitation.avatar_gender,
      ]);
      await connection.execute(
        'UPDATE user_invitations SET accepted_at = UTC_TIMESTAMP(6) WHERE id = ?',
        [invitation.id],
      );
      await recordUserEvent(connection, id, 'users.invitation_accepted', id);
    }),
  );
}
