import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env } from '../../config/env.js';
import { randomUUID } from 'node:crypto';
import { imageSize } from 'image-size';
import type { RowDataPacket } from 'mysql2/promise';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
export function quotationImageType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  return null;
}
export const quotationImageSizeLimit = 8 * 1024 * 1024;
export async function saveQuotationImage(bytes: Buffer, actorId: string) {
  const mime = quotationImageType(bytes);
  if (!mime || bytes.length > quotationImageSizeLimit) throw new HttpError(400, 'INVALID_IMAGE');
  try {
    const dimensions = imageSize(bytes);
    if (
      !dimensions.width ||
      !dimensions.height ||
      dimensions.width > 12000 ||
      dimensions.height > 12000 ||
      dimensions.width * dimensions.height > 40000000
    )
      throw new Error('Invalid dimensions');
  } catch {
    throw new HttpError(400, 'INVALID_IMAGE_DIMENSIONS');
  }
  const id = randomUUID();
  const key = `${id}.${mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp'}`;
  await mkdir(quotationMediaDirectory(), { recursive: true });
  const filename = quotationMediaFilename(key);
  await writeFile(filename, bytes, { flag: 'wx', mode: 0o600 });
  try {
    await transaction(async (connection) => {
      await connection.execute(
        'INSERT INTO quotation_media (id,mime_type,byte_size,content,storage_key,created_by) VALUES (?,?,?,NULL,?,?)',
        [id, mime, bytes.length, key, actorId],
      );
      await writeAuditEvent(connection, {
        actorId,
        action: 'quotations.media_uploaded',
        entityType: 'quotation_media',
        entityId: id,
        module: 'quotations',
      });
    });
  } catch (error) {
    try {
      await unlink(filename);
    } catch (cleanupError) {
      console.error('Quotation upload cleanup failed', {
        errorType: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
      });
    }
    throw error;
  }
  return { id, mimeType: mime, byteSize: bytes.length };
}
export function quotationMediaDirectory(): string {
  const isolated =
    process.env.CORE_TEST_DATABASE === env.DB_NAME &&
    /^travneeds_crm_test_[a-f0-9]{12}$/.test(env.DB_NAME);
  return isolated
    ? path.join(os.tmpdir(), 'travneeds-quotation-media', env.DB_NAME)
    : path.resolve('server/storage/quotation-media');
}
function quotationMediaFilename(key: string): string {
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key) || path.basename(key) !== key)
    throw new HttpError(503, 'MEDIA_STORAGE_UNAVAILABLE');
  const root = quotationMediaDirectory();
  const filename = path.resolve(root, key);
  if (!filename.startsWith(root + path.sep)) throw new HttpError(503, 'MEDIA_STORAGE_UNAVAILABLE');
  return filename;
}
export async function readQuotationImage(id: string) {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      mime_type: string;
      byte_size: number;
      content: Buffer | null;
      storage_key: string | null;
      created_by: string;
    })[]
  >('SELECT mime_type,byte_size,content,storage_key,created_by FROM quotation_media WHERE id=?', [
    id,
  ]);
  const row = rows[0];
  if (!row) throw new HttpError(404, 'NOT_FOUND');
  let content = row.content;
  if (!content && row.storage_key) {
    try {
      content = await readFile(quotationMediaFilename(row.storage_key));
    } catch {
      throw new HttpError(503, 'MEDIA_STORAGE_UNAVAILABLE');
    }
  }
  if (!content || content.length !== row.byte_size)
    throw new HttpError(503, 'MEDIA_STORAGE_UNAVAILABLE');
  return { ...row, content };
}
