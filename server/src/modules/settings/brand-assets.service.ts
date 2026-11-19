import { randomUUID } from 'node:crypto';
import { imageSize } from 'image-size';
import type { RowDataPacket } from 'mysql2/promise';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { quotationImageType } from '../quotations/quotation-media.service.js';

export const brandAssetLimit = 512 * 1024;
export type BrandAssetKind = 'logo' | 'favicon';
const assetPattern = /^\/api\/settings\/brand-assets\/([a-f0-9-]{36})\.(png|jpg|webp|ico)$/;
export function isUploadedBrandAsset(path: string) {
  return assetPattern.test(path);
}
export async function readBrandAsset(path: string, kind?: BrandAssetKind) {
  const match = assetPattern.exec(path);
  if (!match) throw new HttpError(404, 'NOT_FOUND');
  const [rows] = await pool.execute<(RowDataPacket & { content: Buffer; mime: string })[]>(
    'SELECT content,mime_type AS mime FROM project_brand_assets WHERE id=? AND extension=? AND (? IS NULL OR kind=?)',
    [match[1], match[2], kind ?? null, kind ?? null],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  return rows[0];
}
export async function uploadBrandAsset(kind: BrandAssetKind, bytes: Buffer, actorId: string) {
  if (!Buffer.isBuffer(bytes) || bytes.length > brandAssetLimit)
    throw new HttpError(400, 'INVALID_IMAGE');
  const rasterMime = quotationImageType(bytes);
  const ico = kind === 'favicon' && bytes.length >= 22 && bytes.readUInt32LE(0) === 65536;
  const mime = rasterMime ?? (ico ? 'image/x-icon' : null);
  if (!mime) throw new HttpError(400, 'INVALID_IMAGE');
  try {
    const { width, height } = imageSize(bytes);
    const limit = kind === 'favicon' ? 512 : 3000;
    if (!width || !height || width > limit || height > limit) throw new Error('size');
  } catch {
    throw new HttpError(400, 'INVALID_IMAGE_DIMENSIONS');
  }
  const extension = mime === 'image/jpeg' ? 'jpg' : ico ? 'ico' : mime.split('/')[1];
  const id = randomUUID();
  await transaction(async (connection) => {
    await connection.execute(
      'INSERT INTO project_brand_assets (id,kind,extension,mime_type,content,uploaded_by) VALUES (?,?,?,?,?,?)',
      [id, kind, extension, mime, bytes, actorId],
    );
    await writeAuditEvent(connection, {
      actorId,
      action: 'settings.brand_asset_uploaded',
      entityType: 'brand_asset',
      entityId: id,
      module: 'settings',
    });
  });
  return { url: `/api/settings/brand-assets/${id}.${extension}` };
}
