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
  const migrations = [
    '001_foundation',
    '002_account_notifications',
    '003_account_avatars',
    '004_user_management',
    '005_crm_directories',
    '006_user_details_audit',
    '007_finance_foundation',
    '008_itemized_invoices',
    '009_invoice_payment_terms',
    '010_integration_settings',
    '011_quotations',
    '012_quotation_media_storage',
    '013_travel_bookings',
    '014_inbox',
    '015_email_deliveries',
    '016_google_login',
    '017_brand_assets_and_currencies',
    '018_travel_catalogue',
    '019_catalogue_commercial_values',
  ];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM schema_migrations WHERE version IN (${migrations.map(() => '?').join(', ')})`,
    migrations,
  );
  if (Number(rows[0]?.count) !== migrations.length)
    throw new Error('Database migration is required.');
}
