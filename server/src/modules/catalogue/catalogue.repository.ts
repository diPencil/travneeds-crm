import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type {
  CatalogueEntry,
  CatalogueHotel,
  CatalogueKind,
  CatalogueSelection,
} from '../../../../shared/catalogue/catalogue.contracts.js';
import { pool } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';

type Db = Pool | PoolConnection;
const fields =
  'id,kind,name_en,name_ar,slug,hotel_id,details,price_currency,price_amount,cost_amount,version,active';
function toEntry(row: RowDataPacket): CatalogueEntry {
  return {
    id: row.id,
    kind: row.kind,
    name: { en: row.name_en, ar: row.name_ar },
    slug: row.slug ?? '',
    hotelId: row.hotel_id,
    details: {
      ...JSON.parse(row.details),
      ...(row.price_currency ? { currency: row.price_currency } : {}),
      ...(row.price_amount === null ? {} : { price: String(row.price_amount) }),
      ...(row.cost_amount === null ? {} : { cost: String(row.cost_amount) }),
    },
    version: row.version,
    active: Boolean(row.active),
  };
}
export async function readCatalogueEntry(db: Db, id: string, kind?: CatalogueKind) {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT ${fields} FROM travel_catalogue WHERE id=? AND (? IS NULL OR kind=?)`,
    [id, kind ?? null, kind ?? null],
  );
  if (!rows[0]) throw new HttpError(404, 'CATALOGUE_NOT_FOUND');
  return toEntry(rows[0]);
}
export async function catalogueList(kind: CatalogueKind, search: string, page: number) {
  const pattern = `%${search.replace(/[!%_]/g, '!$&')}%`;
  const where =
    "WHERE kind=? AND (name_en LIKE ? ESCAPE '!' OR name_ar LIKE ? ESCAPE '!' OR slug LIKE ? ESCAPE '!')";
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${fields} FROM travel_catalogue ${where} ORDER BY active DESC,
    COALESCE(CAST(JSON_VALUE(details,'$.displayOrder') AS UNSIGNED),999999),name_en,name_ar,id LIMIT 31 OFFSET ?`,
    [kind, pattern, pattern, pattern, (page - 1) * 30],
  );
  return { entries: rows.slice(0, 30).map(toEntry), hasMore: rows.length > 30 };
}
export async function readCatalogueSelection(): Promise<CatalogueSelection> {
  const [rows] = await pool.query<
    RowDataPacket[]
  >(`SELECT ${fields} FROM travel_catalogue WHERE active=TRUE AND kind<>'rooms'
    ORDER BY COALESCE(CAST(JSON_VALUE(details,'$.displayOrder') AS UNSIGNED),999999),name_en,name_ar,id`);
  const selection: CatalogueSelection = {
    destinations: [],
    'multi-day-categories': [],
    hotels: [],
    meals: [],
    amenities: [],
    'travel-add-ons': [],
  };
  for (const row of rows) {
    const entry = toEntry(row);
    if (entry.kind !== 'rooms') selection[entry.kind].push(entry);
  }
  return selection;
}
export async function readCatalogueHotel(db: Db, id: string): Promise<CatalogueHotel> {
  const hotel = await readCatalogueEntry(db, id, 'hotels');
  const [rooms] = await db.execute<RowDataPacket[]>(
    `SELECT ${fields} FROM travel_catalogue WHERE hotel_id=? AND active=TRUE ORDER BY name_en,name_ar,id`,
    [id],
  );
  const [options] = await db.execute<RowDataPacket[]>(
    `SELECT ${fields
      .split(',')
      .map((field) => 'e.' + field)
      .join(',')}
    FROM travel_catalogue e WHERE e.active=TRUE AND (
      EXISTS(SELECT 1 FROM travel_hotel_options l WHERE l.hotel_id=? AND l.option_id=e.id)
      OR (e.kind='meals' AND EXISTS(SELECT 1 FROM travel_catalogue r WHERE r.hotel_id=? AND r.active=TRUE AND JSON_VALUE(r.details,'$.mealId')=e.id))
    ) ORDER BY e.name_en,e.name_ar,e.id`,
    [id, id],
  );
  return { hotel, rooms: rooms.map(toEntry), options: options.map(toEntry) };
}
