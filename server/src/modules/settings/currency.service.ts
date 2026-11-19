import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { convertCurrencyAmount } from '../../../../shared/currency/currency-money.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine((value) => Intl.supportedValuesOf('currency').includes(value));
export const currencyRateInput = z
  .object({
    baseCurrency: currency,
    quoteCurrency: currency,
    rate: z
      .string()
      .regex(/^(0|[1-9]\d{0,11})(\.\d{1,8})?$/)
      .refine((value) => Number(value) > 0),
    effectiveAt: z.iso.datetime(),
    source: z.string().trim().min(1).max(160),
    version: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => value.baseCurrency !== value.quoteCurrency);
export const currencyConversionInput = z
  .object({
    baseCurrency: currency,
    quoteCurrency: currency,
    amount: z.string().regex(/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/),
  })
  .strict();
export async function saveCurrencyRate(input: z.infer<typeof currencyRateInput>, actorId: string) {
  await transaction(async (connection) => {
    await connection.execute('SELECT id FROM project_settings WHERE id=1 FOR UPDATE');
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT version FROM currency_rates WHERE base_currency=? AND quote_currency=? FOR UPDATE',
      [input.baseCurrency, input.quoteCurrency],
    );
    if ((rows[0]?.version ?? 0) !== input.version) throw new HttpError(409, 'SETTINGS_CONFLICT');
    await connection.execute(
      `INSERT INTO currency_rates (base_currency,quote_currency,rate,effective_at,source,updated_by,version) VALUES (?,?,?,?,?,?,1)
      ON DUPLICATE KEY UPDATE rate=VALUES(rate),effective_at=VALUES(effective_at),source=VALUES(source),updated_by=VALUES(updated_by),version=version+1`,
      [
        input.baseCurrency,
        input.quoteCurrency,
        input.rate,
        new Date(input.effectiveAt),
        input.source,
        actorId,
      ],
    );
    await connection.execute('INSERT IGNORE INTO project_currencies (code) VALUES (?),(?)', [
      input.baseCurrency,
      input.quoteCurrency,
    ]);
    await writeAuditEvent(connection, {
      actorId,
      action: 'settings.currency_rate_updated',
      entityType: 'currency_rate',
      entityId: `${input.baseCurrency}/${input.quoteCurrency}`,
      module: 'settings',
    });
  });
}
export async function convertStoredCurrency(input: z.infer<typeof currencyConversionInput>) {
  if (input.baseCurrency === input.quoteCurrency)
    return {
      ...input,
      convertedAmount: convertCurrencyAmount(input.amount, '1'),
      rate: '1.00000000',
      effectiveAt: null,
      source: 'same_currency',
    };
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT rate,effective_at AS effectiveAt,source FROM currency_rates
    WHERE base_currency=? AND quote_currency=? AND effective_at<=UTC_TIMESTAMP(6)`,
    [input.baseCurrency, input.quoteCurrency],
  );
  if (!rows[0]) throw new HttpError(409, 'CURRENCY_RATE_UNAVAILABLE');
  try {
    return {
      ...input,
      convertedAmount: convertCurrencyAmount(input.amount, rows[0].rate),
      rate: rows[0].rate,
      effectiveAt: rows[0].effectiveAt,
      source: rows[0].source,
    };
  } catch {
    throw new HttpError(400, 'INVALID_CONVERSION_AMOUNT');
  }
}
