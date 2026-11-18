import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { env } from '../../server/src/config/env.js';

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_MIGRATION_USER,
  password: env.DB_MIGRATION_PASSWORD,
  multipleStatements: false,
});
const lockName = `${env.DB_NAME}.migrations`;
try {
  await connection.query("SET time_zone = '+00:00'");
  const [locks] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [
    lockName,
  ]);
  if (Number(locks[0]?.acquired) !== 1)
    throw new Error('Another migration process holds the database lock.');
  await connection.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL,
    applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const folder = new URL('../database/migrations/', import.meta.url);
  for (const name of (await readdir(folder)).filter((file) => file.endsWith('.sql')).sort()) {
    const sql = (await readFile(new URL(name, folder), 'utf8')).replace(/\r\n/g, '\n');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const version = name.replace(/\.sql$/, '');
    const [applied] = await connection.execute<RowDataPacket[]>(
      'SELECT checksum FROM schema_migrations WHERE version = ?',
      [version],
    );
    if (applied[0]) {
      if (applied[0].checksum !== checksum)
        throw new Error(`Applied migration was modified: ${name}`);
      continue;
    }
    // MariaDB DDL implicitly commits. Each statement must support safe reruns after interruption.
    for (const statement of sql
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)) {
      await connection.query(statement);
    }
    await connection.execute('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', [
      version,
      checksum,
    ]);
    console.log(`Applied ${name}`);
  }
} finally {
  await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
  await connection.end();
}
