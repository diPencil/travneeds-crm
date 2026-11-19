import { createHash, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import {
  hotelOptionKinds,
  catalogueNameLimits,
  type CatalogueEntry,
  type CatalogueInput,
  type CatalogueKind,
} from '../../../../shared/catalogue/catalogue.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { sanitizeRichText } from '../../http/rich-text.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { readCatalogueEntry } from './catalogue.repository.js';

const normalize = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const key = (value: string) =>
  normalize(value) ? createHash('sha256').update(normalize(value)).digest('hex') : null;
const optionalFields: Record<CatalogueKind, readonly string[]> = {
  destinations: [
    'description',
    'images',
    'displayOrder',
    'showInOneDayTours',
    'showInDestinations',
  ],
  'multi-day-categories': ['description', 'images', 'displayOrder'],
  hotels: ['description', 'images', 'location', 'rating', 'supplierId', 'contact', 'destinationId'],
  rooms: [
    'description',
    'adults',
    'children',
    'infants',
    'mealId',
    'board',
    'currency',
    'price',
    'cost',
  ],
  meals: ['description'],
  amenities: ['description'],
  'travel-add-ons': ['description', 'price', 'currency'],
};

export async function assertCatalogueKind(db: PoolConnection, id: string, kind: CatalogueKind) {
  const entry = await readCatalogueEntry(db, id, kind).catch((error: unknown) => {
    if (error instanceof HttpError && error.status === 404)
      throw new HttpError(400, 'INVALID_CATALOGUE_REFERENCE');
    throw error;
  });
  return entry;
}
export async function storeCatalogueEntry(
  db: PoolConnection,
  kind: CatalogueKind,
  input: CatalogueInput,
  actor: AuthUser,
  mode: 'explicit' | 'reuse',
  id?: string,
): Promise<CatalogueEntry> {
  const name = { en: input.name.en.trim(), ar: input.name.ar.trim() };
  const maxName = catalogueNameLimits[kind];
  if ((!name.en && !name.ar) || name.en.length > maxName || name.ar.length > maxName)
    throw new HttpError(400, 'INVALID_CATALOGUE_NAME');
  if (
    (kind === 'rooms') !== Boolean(input.hotelId) ||
    (input.optionIds.length && kind !== 'hotels') ||
    (input.slug && kind !== 'destinations' && kind !== 'multi-day-categories') ||
    Object.keys(input.details).some((field) => !optionalFields[kind].includes(field))
  )
    throw new HttpError(400, 'INVALID_CATALOGUE_DETAILS');
  const enKey = key(name.en),
    arKey = key(name.ar);
  const [duplicates] = await db.execute<RowDataPacket[]>(
    'SELECT id FROM travel_catalogue WHERE kind=? AND scope_key=? AND (en_key=? OR ar_key=?)',
    [kind, input.hotelId ?? '', enKey, arKey],
  );
  const other = duplicates.filter((row) => row.id !== id);
  if (other.length) {
    if (mode === 'reuse' && other.length === 1) return readCatalogueEntry(db, other[0].id, kind);
    throw new HttpError(409, 'CATALOGUE_DUPLICATE');
  }
  if (input.hotelId) await assertCatalogueKind(db, input.hotelId, 'hotels');
  if (input.linkHotelId) {
    if (!hotelOptionKinds.some((optionKind) => optionKind === kind))
      throw new HttpError(400, 'INVALID_CATALOGUE_REFERENCE');
    await assertCatalogueKind(db, input.linkHotelId, 'hotels');
  }
  if (input.details.destinationId)
    await assertCatalogueKind(db, input.details.destinationId, 'destinations');
  if (input.details.mealId) await assertCatalogueKind(db, input.details.mealId, 'meals');
  if (
    input.details.currency &&
    !Intl.supportedValuesOf('currency').includes(input.details.currency)
  )
    throw new HttpError(400, 'INVALID_CURRENCY');
  if (input.details.supplierId) {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM suppliers WHERE id=? AND archived_at IS NULL',
      [input.details.supplierId],
    );
    if (!rows.length) throw new HttpError(400, 'INVALID_SUPPLIER');
  }
  const optionIds = [...new Set(input.optionIds)];
  for (const optionId of optionIds) {
    const option = await readCatalogueEntry(db, optionId);
    if (!hotelOptionKinds.some((allowed) => allowed === option.kind))
      throw new HttpError(400, 'INVALID_CATALOGUE_REFERENCE');
  }
  const images = [...new Set(input.details.images ?? [])];
  for (const mediaId of images) {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT created_by,EXISTS(SELECT 1 FROM travel_catalogue_media WHERE media_id=m.id) AS shared FROM quotation_media m WHERE id=?',
      [mediaId],
    );
    if (
      !rows[0] ||
      (!rows[0].shared && rows[0].created_by !== actor.id && !actor.roles.includes('admin'))
    )
      throw new HttpError(400, 'MEDIA_UNAVAILABLE');
  }
  const { price, cost, currency, ...details } = input.details;
  if ((price || cost) && !currency) throw new HttpError(400, 'CATALOGUE_CURRENCY_REQUIRED');
  if (details.description)
    details.description = {
      en: sanitizeRichText(details.description.en),
      ar: sanitizeRichText(details.description.ar),
    };
  const entryId = id ?? randomUUID();
  const data = [
    input.hotelId,
    input.hotelId ?? '',
    name.en,
    name.ar,
    enKey,
    arKey,
    input.slug || null,
    JSON.stringify(details),
    input.active,
    currency ?? null,
    price || null,
    cost || null,
  ];
  if (id) {
    const current = await readCatalogueEntry(db, id, kind);
    if (current.version !== input.version) throw new HttpError(409, 'RECORD_CHANGED');
    if (current.hotelId !== input.hotelId) throw new HttpError(409, 'CATALOGUE_HOTEL_FIXED');
    if (current.active !== input.active && !actor.roles.includes('admin'))
      throw new HttpError(403, 'FORBIDDEN');
    await db.execute(
      'UPDATE travel_catalogue SET hotel_id=?,scope_key=?,name_en=?,name_ar=?,en_key=?,ar_key=?,slug=?,details=?,active=?,price_currency=?,price_amount=?,cost_amount=?,version=version+1 WHERE id=?',
      [...data, id],
    );
    if (kind === 'hotels')
      await db.execute('DELETE FROM travel_hotel_options WHERE hotel_id=?', [id]);
  } else {
    if (!input.active && !actor.roles.includes('admin')) throw new HttpError(403, 'FORBIDDEN');
    await db.execute(
      'INSERT INTO travel_catalogue (hotel_id,scope_key,name_en,name_ar,en_key,ar_key,slug,details,active,price_currency,price_amount,cost_amount,id,kind,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [...data, entryId, kind, actor.id],
    );
  }
  for (const mediaId of images)
    await db.execute('INSERT IGNORE INTO travel_catalogue_media (entry_id,media_id) VALUES (?,?)', [
      entryId,
      mediaId,
    ]);
  for (const optionId of optionIds) await linkHotelOption(db, entryId, optionId);
  if (input.linkHotelId) await linkHotelOption(db, input.linkHotelId, entryId, true);
  await writeAuditEvent(db, {
    actorId: actor.id,
    action: id ? 'catalogue.updated' : 'catalogue.created',
    module: 'quotations',
    entityType: kind,
    entityId: entryId,
  });
  return readCatalogueEntry(db, entryId, kind);
}
export async function saveCatalogue(
  kind: CatalogueKind,
  input: CatalogueInput,
  actor: AuthUser,
  id?: string,
) {
  return transaction(async (db) => {
    await db.execute('SELECT id FROM project_settings WHERE id=1 FOR UPDATE');
    return storeCatalogueEntry(db, kind, input, actor, 'explicit', id);
  }).catch((error: unknown) => {
    if ((error as { code?: string } | null)?.code === 'ER_DUP_ENTRY')
      throw new HttpError(409, 'CATALOGUE_DUPLICATE');
    throw error;
  });
}
export async function linkHotelOption(
  db: PoolConnection,
  hotelId: string,
  optionId: string,
  advanceVersion = false,
) {
  const [result] = await db.execute(
    'INSERT IGNORE INTO travel_hotel_options (hotel_id,option_id) VALUES (?,?)',
    [hotelId, optionId],
  );
  if (advanceVersion && 'affectedRows' in result && result.affectedRows)
    await db.execute('UPDATE travel_catalogue SET version=version+1 WHERE id=?', [hotelId]);
}
export async function isCatalogueMedia(id: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM travel_catalogue_media WHERE media_id=? LIMIT 1',
    [id],
  );
  return rows.length > 0;
}
