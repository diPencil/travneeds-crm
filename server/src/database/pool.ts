import mysql, { type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env.js';

export const databaseOptions = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  multipleStatements: false,
};

export const pool = mysql.createPool({
  ...databaseOptions,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 50,
  connectTimeout: 5000,
});

pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function transaction<T>(
  operation: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDatabase(): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS count FROM schema_migrations WHERE version = ?',
    ['001_foundation'],
  );
  if (Number(rows[0]?.count) !== 1) throw new Error('Database migration is required.');
}
