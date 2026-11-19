import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { env } from '../../server/src/config/env.js';

if (env.NODE_ENV === 'production' || !['127.0.0.1', 'localhost'].includes(env.DB_HOST)) {
  throw new Error('Core integration tests require a local non-production MySQL server.');
}

// The integration suite never creates fixtures in the owner's development database.
const database = `travneeds_crm_test_${randomBytes(6).toString('hex')}`;
if (!/^travneeds_crm_test_[a-f0-9]{12}$/.test(database))
  throw new Error('Invalid isolated test database');
const mediaRoot = path.resolve(os.tmpdir(), 'travneeds-quotation-media');
const testMedia = path.resolve(mediaRoot, database);
if (!testMedia.startsWith(mediaRoot + path.sep) || path.basename(testMedia) !== database)
  throw new Error('Unsafe test media cleanup path');
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_MIGRATION_USER,
  password: env.DB_MIGRATION_PASSWORD,
});
const childEnv = { ...process.env, DB_NAME: database, CORE_TEST_DATABASE: database };
let result = 1;
try {
  await connection.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  const migrate = spawnSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'docs/scripts/migrate.ts'],
    { env: childEnv, stdio: 'inherit' },
  );
  if (migrate.status === 0) {
    result =
      spawnSync(
        process.execPath,
        ['node_modules/tsx/dist/cli.mjs', '--test', 'server/tests/core.integration.test.ts'],
        { env: childEnv, stdio: 'inherit' },
      ).status ?? 1;
  }
} catch {
  console.error('Isolated core integration run failed. No development fixtures were created.');
} finally {
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
  await rm(testMedia, { recursive: true, force: true });
}
process.exitCode = result;
