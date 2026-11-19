import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import { env } from '../../config/env.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { actorScope, readQuotation, quotationFromRow } from './quotations.repository.js';

export async function createQuotationShare(
  id: string,
  version: number,
  expiresAt: string,
  actor: AuthUser,
) {
  const token = randomBytes(32).toString('base64url');
  const shareId = randomUUID();
  const expires = new Date(expiresAt);
  const now = Date.now();
  if (
    !Number.isFinite(expires.getTime()) ||
    expires.getTime() <= now ||
    expires.getTime() > now + 30 * 86400000
  )
    throw new HttpError(400, 'INVALID_SHARE_EXPIRY');
  await transaction(async (connection) => {
    const scope = actorScope(actor);
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT q.customer_id,q.current_version,q.status,q.valid_until FROM quotations q WHERE q.id=? AND ${scope.sql} FOR UPDATE`,
      [id, ...scope.values],
    );
    const quote = rows[0];
    if (!quote) throw new HttpError(404, 'NOT_FOUND');
    if (quote.current_version !== version) throw new HttpError(409, 'RECORD_CHANGED');
    if (
      !quote.customer_id ||
      !['ready', 'sent', 'accepted', 'booked'].includes(quote.status) ||
      !quote.valid_until ||
      String(quote.valid_until) < new Date().toISOString().slice(0, 10)
    )
      throw new HttpError(409, 'QUOTATION_NOT_READY');
    await connection.execute(
      'INSERT INTO quotation_shares (id,quotation_id,quotation_version,token_digest,expires_at,created_by) VALUES (?,?,?,?,?,?)',
      [shareId, id, version, createHash('sha256').update(token).digest('hex'), expires, actor.id],
    );
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: 'quotations.share_created',
      entityType: 'quotation',
      entityId: id,
      module: 'quotations',
    });
  });
  return {
    id: shareId,
    url: `${env.APP_ORIGIN}/q/${shareId}#token=${token}`,
    expiresAt: expires.toISOString(),
  };
}
export async function readPublicQuotation(shareId: string, token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(404, 'NOT_FOUND');
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT CAST(q.id AS CHAR) AS id,q.reference,q.created_by AS createdBy,q.created_at AS createdAt,q.updated_at AS updatedAt,
    q.status,q.current_version,r.version AS revision,r.content_json,r.price_json,r.context_json,s.id AS shareId,s.expires_at AS shareExpiresAt
    FROM quotation_shares s JOIN quotations q ON q.id=s.quotation_id JOIN quotation_revisions r ON r.quotation_id=q.id AND r.version=s.quotation_version
    WHERE s.id=? AND s.token_digest=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP(6)`,
    [shareId, createHash('sha256').update(token).digest('hex')],
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
  const document = quotationFromRow(rows[0]);
  return {
    document,
    shareId,
    expiresAt: rows[0].shareExpiresAt as string,
    superseded: rows[0].current_version !== document.version,
  };
}
export async function listQuotationShares(id: string, actor: AuthUser) {
  await readQuotation(id, actor);
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id,quotation_version AS version,expires_at AS expiresAt,revoked_at AS revokedAt,created_at AS createdAt FROM quotation_shares WHERE quotation_id=? ORDER BY created_at DESC LIMIT 100',
    [id],
  );
  return rows;
}
export async function revokeQuotationShare(id: string, shareId: string, actor: AuthUser) {
  await transaction(async (connection) => {
    const scope = actorScope(actor);
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT q.id FROM quotations q WHERE q.id=? AND ${scope.sql} FOR UPDATE`,
      [id, ...scope.values],
    );
    if (!rows[0]) throw new HttpError(404, 'NOT_FOUND');
    const [shares] = await connection.execute<RowDataPacket[]>(
      'SELECT id,revoked_at FROM quotation_shares WHERE id=? AND quotation_id=? FOR UPDATE',
      [shareId, id],
    );
    if (!shares[0]) throw new HttpError(404, 'NOT_FOUND');
    if (shares[0].revoked_at) return;
    await connection.execute('UPDATE quotation_shares SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?', [
      shareId,
    ]);
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: 'quotations.share_revoked',
      entityType: 'quotation',
      entityId: id,
      module: 'quotations',
    });
  });
}
