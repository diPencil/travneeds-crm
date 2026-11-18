import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthUser, UserRole } from '../../../../shared/auth/auth.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { hashPassword } from '../auth/passwords.js';
import { HttpError } from '../../http/errors.js';

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  status: 'active' | 'disabled';
  created_at: string;
}

export async function getPublicUser(id: string): Promise<AuthUser | null> {
  const [users] = await pool.execute<UserRow[]>(
    'SELECT id, email, full_name, created_at FROM users WHERE id = ? AND status = ?',
    [id, 'active'],
  );
  const user = users[0];
  if (!user) return null;
  const [roles] = await pool.execute<(RowDataPacket & { role_code: UserRole })[]>(
    'SELECT role_code FROM user_roles WHERE user_id = ? ORDER BY role_code',
    [id],
  );
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    createdAt: user.created_at,
    roles: roles.map((row) => row.role_code),
  };
}

export async function createInitialAdmin(
  fullName: string,
  email: string,
  password: string,
): Promise<void> {
  const hash = await hashPassword(password);
  await transaction(async (connection) => {
    // The configuration row provides a stable lock for concurrent bootstrap requests.
    await connection.execute('SELECT id FROM project_settings WHERE id = 1 FOR UPDATE');
    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT user_id FROM user_roles WHERE role_code = 'admin' LIMIT 1",
    );
    if (existing.length) throw new HttpError(409, 'ADMIN_ALREADY_EXISTS');
    const id = randomUUID();
    await connection.execute(
      'INSERT INTO users (id, full_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [id, fullName, email.toLowerCase(), hash],
    );
    await connection.execute("INSERT INTO user_roles (user_id, role_code) VALUES (?, 'admin')", [
      id,
    ]);
    await connection.execute(
      "INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES (?, 'admin.bootstrap', 'user', ?)",
      [id, id],
    );
  });
}
