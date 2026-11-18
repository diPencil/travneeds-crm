import mysql from 'mysql2/promise';
import { env } from '../../server/src/config/env.js';

if (!/^[a-zA-Z0-9_]+$/.test(env.DB_USER) || env.DB_HOST !== '127.0.0.1') {
  throw new Error('This provisioning command supports a dedicated local XAMPP account only.');
}
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_MIGRATION_USER,
  password: env.DB_MIGRATION_PASSWORD,
});
try {
  const account = `${connection.escape(env.DB_USER)}@'127.0.0.1'`;
  await connection.query(
    `CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${connection.escape(env.DB_PASSWORD)}`,
  );
  await connection.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${env.DB_NAME}\`.* TO ${account}`,
  );
  const runtime = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });
  await runtime.end();
  console.log('Dedicated local database account verified.');
} catch (error) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'DATABASE_SETUP_FAILED';
  console.error(
    `Database setup failed (${code}). Check the local MariaDB error log. Credentials are omitted.`,
  );
  process.exitCode = 1;
} finally {
  await connection.end();
}
