import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';

let contents = '';
try {
  contents = await readFile('.env', 'utf8');
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
}
const existing = parse(contents);
if (process.argv.includes('--rotate-db-password')) {
  contents = contents.replace(
    /^DB_PASSWORD=.*$/m,
    `DB_PASSWORD=${randomBytes(32).toString('hex')}`,
  );
}
const defaults: Record<string, string> = {
  NODE_ENV: 'development',
  API_HOST: '127.0.0.1',
  API_PORT: '3001',
  APP_ORIGIN: 'http://127.0.0.1:5173',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_NAME: 'travneeds_crm',
  DB_USER: 'travneeds_app',
  DB_PASSWORD: randomBytes(32).toString('hex'),
  DB_MIGRATION_USER: 'root',
  DB_MIGRATION_PASSWORD: '',
};
const obsolete = /^VITE_SUPABASE_(URL|ANON_KEY)=.*$/gm;
contents = contents.replace(obsolete, '').trimEnd();
for (const [key, value] of Object.entries(defaults)) {
  if (!(key in existing)) contents += `\n${key}=${value}`;
}
await writeFile('.env', `${contents.trimStart()}\n`, { mode: 0o600 });
console.log('Local configuration prepared.');
