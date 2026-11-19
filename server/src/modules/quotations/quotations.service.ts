import { synchroniseQuotationCatalogue } from '../catalogue/quotation-catalogue.service.js';
import { createHash, randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { z } from 'zod';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  QuotationPrice,
  QuotationContent,
  QuotationStatus,
} from '../../../../shared/quotations/quotation.contracts.js';
import { calculateQuotation } from '../../../../shared/quotations/quotation-pricing.js';
import type { quotationSaveInput } from '../../../../shared/quotations/quotation.validation.js';
import { transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { validateQuotationMedia, sanitizeQuotationContent } from './quotation-content.js';
import * as repository from './quotations.repository.js';

export function requireReadyQuotation(
  content: QuotationContent,
  customerId: string,
  price: QuotationPrice | null,
) {
  if (
    !customerId ||
    !price ||
    (!content.title.en.trim() && !content.title.ar.trim()) ||
    !content.pricing.startDate ||
    !content.validUntil ||
    content.validUntil < new Date().toISOString().slice(0, 10)
  )
    throw new HttpError(400, 'QUOTATION_INCOMPLETE');
  if (content.type === 'nile-cruises' && !content.cruiseType)
    throw new HttpError(400, 'QUOTATION_INCOMPLETE');
  if (
    content.type === 'shore-excursions' &&
    !content.departurePort.en.trim() &&
    !content.departurePort.ar.trim()
  )
    throw new HttpError(400, 'QUOTATION_INCOMPLETE');
  if (
    content.hotels.some(
      (stay) => (!stay.name.en.trim() && !stay.name.ar.trim()) || !stay.rooms.length,
    )
  )
    throw new HttpError(400, 'QUOTATION_INCOMPLETE');
}
function quotationPrice(content: QuotationContent): QuotationPrice | null {
  try {
    return calculateQuotation(content);
  } catch {
    return null;
  }
}
export async function saveQuotation(
  input: z.infer<typeof quotationSaveInput>,
  actor: AuthUser,
  id?: string,
  status?: Exclude<QuotationStatus, 'expired' | 'booked'>,
) {
  const content = sanitizeQuotationContent(input.content);
  const size = Buffer.byteLength(JSON.stringify(content));
  if (!Intl.supportedValuesOf('currency').includes(content.pricing.currency))
    throw new HttpError(400, 'INVALID_CURRENCY');
  if (size > 750 * 1024) throw new HttpError(413, 'QUOTATION_CONTENT_TOO_LARGE');
  let price = quotationPrice(content);
  const digest = createHash('sha256')
    .update(JSON.stringify({ input, actor: actor.id, id: id ?? null, status: status ?? 'draft' }))
    .digest('hex');
  const savedId = await transaction(async (connection) => {
    await connection.execute('SELECT id FROM project_settings WHERE id=1 FOR UPDATE');
    let row: RowDataPacket | undefined;
    if (id) {
      const scope = repository.actorScope(actor);
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT q.*,r.price_json AS saved_price,r.context_json AS saved_context FROM quotations q JOIN quotation_revisions r ON r.quotation_id=q.id AND r.version=q.current_version WHERE q.id=? AND ${scope.sql} FOR UPDATE`,
        [id, ...scope.values],
      );
      row = rows[0];
      if (!row) throw new HttpError(404, 'NOT_FOUND');
    }
    const [requests] = await connection.execute<RowDataPacket[]>(
      'SELECT CAST(quotation_id AS CHAR) AS quotationId,request_digest FROM quotation_revisions WHERE request_key=?',
      [input.requestKey],
    );
    if (requests[0]) {
      if (requests[0].request_digest !== digest || (id && id !== requests[0].quotationId))
        throw new HttpError(409, 'QUOTATION_REQUEST_CONFLICT');
      return String(requests[0].quotationId);
    }
    if ((row?.current_version ?? 0) !== input.version) throw new HttpError(409, 'RECORD_CHANGED');
    if (row?.status === 'booked') throw new HttpError(409, 'QUOTATION_ALREADY_BOOKED');
    if (status && status !== 'ready' && row)
      price = row.saved_price ? (JSON.parse(row.saved_price) as QuotationPrice) : null;
    const nextStatus = status ?? 'draft';
    if (nextStatus !== 'draft') requireReadyQuotation(content, input.customerId, price);
    if (status && row) {
      const allowed: Record<string, string[]> = {
        draft: ['ready'],
        ready: ['sent', 'accepted', 'declined', 'draft'],
        sent: ['accepted', 'declined', 'draft'],
        accepted: ['draft', 'declined'],
        declined: ['draft'],
        expired: ['draft'],
        booked: ['draft'],
      };
      if (!allowed[String(row.status)]?.includes(status))
        throw new HttpError(409, 'INVALID_QUOTATION_TRANSITION');
    }
    const context =
      status && status !== 'ready' && row
        ? JSON.parse(row.saved_context)
        : await repository.readQuotationContext(connection, input.customerId);
    await repository.validateQuotationReferences(connection, content);
    await validateQuotationMedia(connection, content, actor);
    if (!status) await synchroniseQuotationCatalogue(connection, content, actor);
    const contentJson = JSON.stringify(content);
    if (Buffer.byteLength(contentJson) > 750 * 1024)
      throw new HttpError(413, 'QUOTATION_CONTENT_TOO_LARGE');
    let quoteId = id;
    if (!quoteId) {
      const [created] = await connection.execute<ResultSetHeader>(
        `INSERT INTO quotations (reference,customer_id,created_by,trip_type,currency,total,valid_until) VALUES (?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          input.customerId || null,
          actor.id,
          content.type,
          content.pricing.currency,
          price?.total ?? null,
          content.validUntil || null,
        ],
      );
      quoteId = String(created.insertId);
    }
    const version = input.version + 1;
    const reference = `QT-${String(quoteId).padStart(6, '0')}`;
    await connection.execute(
      'UPDATE quotations SET reference=?,customer_id=?,status=?,trip_type=?,currency=?,total=?,current_version=?,valid_until=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?',
      [
        reference,
        input.customerId || null,
        nextStatus,
        content.type,
        content.pricing.currency,
        price?.total ?? null,
        version,
        content.validUntil || null,
        quoteId,
      ],
    );
    await connection.execute(
      'INSERT INTO quotation_revisions (quotation_id,version,content_json,price_json,context_json,request_key,request_digest,created_by) VALUES (?,?,?,?,?,?,?,?)',
      [
        quoteId,
        version,
        contentJson,
        price ? JSON.stringify(price) : null,
        JSON.stringify(context),
        input.requestKey,
        digest,
        actor.id,
      ],
    );
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: status ? `quotations.${status}` : 'quotations.saved',
      entityType: 'quotation',
      entityId: quoteId,
      module: 'quotations',
    });
    return quoteId;
  });
  return repository.readQuotation(savedId, actor);
}
