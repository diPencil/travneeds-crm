import { isUploadedBrandAsset, readBrandAsset } from './brand-assets.service.js';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type {
  ProjectSettings,
  SettingsResponse,
} from '../../../../shared/settings/settings.contracts.js';
import {
  localBrandAssetPath,
  localBrandAssetPathLimit,
} from '../../../../shared/settings/settings.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { readLicense } from './activation.service.js';

const localAsset = z.string().regex(localBrandAssetPath).max(localBrandAssetPathLimit);
export const settingsInput = z
  .object({
    projectName: z.string().trim().min(1).max(100),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    logoUrl: localAsset,
    faviconUrl: localAsset,
    baseCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .refine((code) => Intl.supportedValuesOf('currency').includes(code)),
    version: z.number().int().nonnegative(),
  })
  .strict();

interface SettingsRow extends RowDataPacket {
  project_name: string;
  primary_color: string;
  logo_url: string;
  favicon_url: string;
  base_currency: string;
  version: number;
}

export async function readSettings(): Promise<ProjectSettings> {
  const [rows] = await pool.execute<SettingsRow[]>('SELECT * FROM project_settings WHERE id = 1');
  const row = rows[0];
  if (!row) throw new HttpError(503, 'SETTINGS_UNAVAILABLE');
  return {
    projectName: row.project_name,
    primaryColor: row.primary_color,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    baseCurrency: row.base_currency,
    version: row.version,
  };
}

export async function readSettingsPage(): Promise<SettingsResponse> {
  const settings = await readSettings();
  const license = await readLicense();
  const [rates] = await pool.execute<RowDataPacket[]>(
    'SELECT base_currency AS baseCurrency, quote_currency AS quoteCurrency, CAST(rate AS CHAR) AS rate, effective_at AS effectiveAt, source, version FROM currency_rates ORDER BY base_currency, quote_currency',
  );
  const [currencies] = await pool.query<RowDataPacket[]>(
    'SELECT code FROM project_currencies ORDER BY code',
  );
  return {
    currencies: currencies.map((row) => String(row.code)),
    supportedCurrencies: Intl.supportedValuesOf('currency'),
    settings,
    license,
    rates: rates as SettingsResponse['rates'],
  };
}

export async function saveSettings(
  input: ProjectSettings,
  actorId: string,
): Promise<ProjectSettings> {
  const publicRoot = await realpath('public');
  for (const [kind, asset] of [
    ['logo', input.logoUrl],
    ['favicon', input.faviconUrl],
  ] as const) {
    if (isUploadedBrandAsset(asset)) {
      await readBrandAsset(asset, kind).catch(() => {
        throw new HttpError(400, 'INVALID_INPUT');
      });
      continue;
    }
    const resolved = await realpath(path.join(publicRoot, asset.slice(1))).catch(() => null);
    if (!resolved || !resolved.startsWith(publicRoot + path.sep))
      throw new HttpError(400, 'INVALID_INPUT');
  }
  await transaction(async (connection) => {
    const [result] = await connection.execute(
      'UPDATE project_settings SET project_name = ?, primary_color = ?, logo_url = ?, favicon_url = ?, base_currency = ?, version = version + 1 WHERE id = 1 AND version = ?',
      [
        input.projectName,
        input.primaryColor,
        input.logoUrl,
        input.faviconUrl,
        input.baseCurrency,
        input.version,
      ],
    );
    if (!('affectedRows' in result) || result.affectedRows !== 1)
      throw new HttpError(409, 'SETTINGS_CONFLICT');
    await connection.execute('INSERT IGNORE INTO project_currencies (code) VALUES (?)', [
      input.baseCurrency,
    ]);
    await connection.execute(
      "INSERT INTO audit_events (actor_id, action, entity_type, entity_id) VALUES (?, 'settings.updated', 'project_settings', '1')",
      [actorId],
    );
  });
  return readSettings();
}
