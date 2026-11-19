import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { integrationDefinitions } from '../../../../shared/settings/integration-definitions.js';
import type {
  IntegrationConfiguration,
  IntegrationProvider,
} from '../../../../shared/settings/integrations.contracts.js';
import { env } from '../../config/env.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { encryptIntegrationSecret, decryptIntegrationSecret } from './integration-secrets.js';

export const integrationInput = z
  .object({
    enabled: z.boolean(),
    fields: z.record(z.string(), z.string().max(500)),
    secrets: z.record(z.string(), z.string().max(4000)),
    clearSecrets: z.array(z.string()).max(8),
    version: z.number().int().nonnegative(),
  })
  .strict();
interface IntegrationRow extends RowDataPacket {
  enabled: number;
  fields_json: string;
  secrets_json: string;
  version: number;
}
const hasControls = (value: string) =>
  Array.from(value).some(
    (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );
const defaultFields = (provider: IntegrationProvider) =>
  Object.fromEntries(
    integrationDefinitions[provider].fields
      .filter((field) => !field.secret)
      .map((field) => [field.key, field.default ?? '']),
  );
function decode(row?: IntegrationRow) {
  return {
    fields: row ? (JSON.parse(row.fields_json) as Record<string, string>) : {},
    secrets: row ? (JSON.parse(row.secrets_json) as Record<string, string>) : {},
  };
}
function complete(
  provider: IntegrationProvider,
  fields: Record<string, string>,
  secrets: Record<string, string>,
) {
  return integrationDefinitions[provider].fields.every(
    (field) =>
      !field.required || Boolean(field.secret ? secrets[field.key] : fields[field.key]?.trim()),
  );
}
export async function readIntegration(
  provider: IntegrationProvider,
): Promise<IntegrationConfiguration> {
  const [rows] = await pool.execute<IntegrationRow[]>(
    'SELECT enabled,fields_json,secrets_json,version FROM integration_settings WHERE provider=?',
    [provider],
  );
  const row = rows[0];
  const values = decode(row);
  const fields = { ...defaultFields(provider), ...values.fields };
  return {
    provider,
    enabled: Boolean(row?.enabled),
    fields,
    secrets: Object.fromEntries(
      integrationDefinitions[provider].fields
        .filter((field) => field.secret)
        .map((field) => [field.key, Boolean(values.secrets[field.key])]),
    ),
    version: row?.version ?? 0,
    configurationStatus: complete(provider, fields, values.secrets)
      ? 'configured'
      : 'not_configured',
    encryptionReady: Boolean(env.INTEGRATION_SECRET_KEY),
    webhookUrl: ['messenger', 'instagram', 'whatsapp'].includes(provider)
      ? `${env.APP_ORIGIN}/api/webhooks/meta/${provider}`
      : null,
  };
}
function validateFields(provider: IntegrationProvider, input: z.infer<typeof integrationInput>) {
  const definition = integrationDefinitions[provider];
  const fields: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input.fields)) {
    const field = definition.fields.find((field) => field.key === key && !field.secret);
    const value = raw.trim();
    if (!field || hasControls(value)) throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    if (value && field.options && !field.options.includes(value))
      throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    if (value && field.kind === 'email' && !z.email().safeParse(value).success)
      throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    if (
      value &&
      field.kind === 'host' &&
      !/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/.test(value)
    )
      throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    if (value && field.kind === 'identifier' && !/^\d{1,40}$/.test(value))
      throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    if (
      value &&
      field.kind === 'number' &&
      (!/^\d{1,5}$/.test(value) ||
        Number(value) < 1 ||
        Number(value) > (key === 'timeout' ? 60 : 65535))
    )
      throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    if (key === 'apiVersion' && value && !/^v\d{1,3}\.0$/.test(value))
      throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
    fields[key] = value;
  }
  const secretKeys = new Set(
    definition.fields.filter((field) => field.secret).map((field) => field.key),
  );
  if ([...Object.keys(input.secrets), ...input.clearSecrets].some((key) => !secretKeys.has(key)))
    throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
  if (Object.values(input.secrets).some((value) => hasControls(value)))
    throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
  if (input.clearSecrets.some((key) => Boolean(input.secrets[key])))
    throw new HttpError(400, 'INVALID_INTEGRATION_FIELD');
  return fields;
}
export async function saveIntegration(
  provider: IntegrationProvider,
  input: z.infer<typeof integrationInput>,
  actorId: string,
) {
  const updates = validateFields(provider, input);
  await transaction(async (connection) => {
    // Serialize configuration creation as well as updates, including absent rows.
    await connection.execute('SELECT id FROM project_settings WHERE id=1 FOR UPDATE');
    const [rows] = await connection.execute<IntegrationRow[]>(
      'SELECT enabled,fields_json,secrets_json,version FROM integration_settings WHERE provider=? FOR UPDATE',
      [provider],
    );
    if ((rows[0]?.version ?? 0) !== input.version) throw new HttpError(409, 'SETTINGS_CONFLICT');
    const stored = decode(rows[0]);
    const fields = { ...defaultFields(provider), ...stored.fields, ...updates };
    const secrets = { ...stored.secrets };
    for (const key of input.clearSecrets) delete secrets[key];
    for (const [key, value] of Object.entries(input.secrets)) {
      if (!value) continue;
      if (!env.INTEGRATION_SECRET_KEY)
        throw new HttpError(503, 'INTEGRATION_ENCRYPTION_UNAVAILABLE');
      secrets[key] = encryptIntegrationSecret(
        value,
        `${provider}:${key}`,
        env.INTEGRATION_SECRET_KEY,
      );
    }
    if (input.enabled && (!env.INTEGRATION_SECRET_KEY || !complete(provider, fields, secrets)))
      throw new HttpError(400, 'INTEGRATION_INCOMPLETE');
    await connection.execute(
      `INSERT INTO integration_settings (provider,enabled,fields_json,secrets_json,version,updated_by) VALUES (?,?,?,?,1,?)
      ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),fields_json=VALUES(fields_json),secrets_json=VALUES(secrets_json),version=version+1,updated_by=VALUES(updated_by)`,
      [provider, input.enabled, JSON.stringify(fields), JSON.stringify(secrets), actorId],
    );
    await writeAuditEvent(connection, {
      actorId,
      action: 'settings.integration_updated',
      entityType: 'integration',
      entityId: provider,
      module: 'settings',
    });
  });
  return readIntegration(provider);
}
// Provider adapters alone consume decrypted credentials; never return this from a route.
export async function readIntegrationCredentials(provider: IntegrationProvider) {
  const [rows] = await pool.execute<IntegrationRow[]>(
    'SELECT enabled,fields_json,secrets_json,version FROM integration_settings WHERE provider=?',
    [provider],
  );
  const row = rows[0];
  if (!row?.enabled) throw new HttpError(503, 'INTEGRATION_NOT_CONFIGURED');
  if (!env.INTEGRATION_SECRET_KEY) throw new HttpError(503, 'INTEGRATION_ENCRYPTION_UNAVAILABLE');
  const stored = decode(row);
  const fields = { ...defaultFields(provider), ...stored.fields };
  if (!complete(provider, fields, stored.secrets))
    throw new HttpError(503, 'INTEGRATION_NOT_CONFIGURED');
  const installationKey = env.INTEGRATION_SECRET_KEY;
  try {
    return {
      ...fields,
      ...Object.fromEntries(
        Object.entries(stored.secrets).map(([key, value]) => [
          key,
          decryptIntegrationSecret(value, `${provider}:${key}`, installationKey),
        ]),
      ),
    };
  } catch {
    throw new HttpError(503, 'INTEGRATION_CREDENTIALS_UNAVAILABLE');
  }
}
