import { createHash, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  EmailDelivery,
  EmailDirectory,
  EmailStatus,
} from '../../../../shared/emails/email.contracts.js';
import { env } from '../../config/env.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { renderQuotationPdf } from '../quotations/quotation-documents.service.js';
import { readPublicQuotation } from '../quotations/quotation-shares.service.js';
import { readQuotation } from '../quotations/quotations.repository.js';
import { smtpTransport } from './smtp.js';

const statusProjection =
  "CASE WHEN e.status='sending' AND e.created_at<DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 15 MINUTE) THEN 'unknown' ELSE e.status END";
const from =
  'FROM email_deliveries e JOIN quotation_shares s ON s.id=e.quotation_share_id JOIN quotations q ON q.id=s.quotation_id';
export async function listEmails(
  actor: AuthUser,
  query: { search: string; status?: EmailStatus; page: number },
): Promise<EmailDirectory> {
  const scope = actor.roles.includes('admin') ? '1=1' : 'e.actor_id=?';
  const scopeValues = actor.roles.includes('admin') ? [] : [actor.id];
  const clauses = [scope];
  const values = [...scopeValues];
  if (query.search) {
    const pattern = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
    clauses.push(
      "(e.recipient_email LIKE ? ESCAPE '!' OR q.reference LIKE ? ESCAPE '!' OR e.subject LIKE ? ESCAPE '!')",
    );
    values.push(pattern, pattern, pattern);
  }
  if (query.status) {
    clauses.push(`(${statusProjection})=?`);
    values.push(query.status);
  }
  const where = clauses.join(' AND ');
  const [[deliveries], [metricRows], [numbers]] = await Promise.all([
    pool.execute<(RowDataPacket & EmailDelivery)[]>(
      `SELECT e.id,${statusProjection} AS status,CAST(q.id AS CHAR) AS quotationId,
      q.reference AS quotationReference,e.recipient_email AS recipient,e.subject,e.created_at AS createdAt,e.finished_at AS finishedAt
      ${from} WHERE ${where} ORDER BY e.created_at DESC,e.id LIMIT 30 OFFSET ?`,
      [...values, (query.page - 1) * 30],
    ),
    pool.execute<(RowDataPacket & { status: EmailStatus; count: string })[]>(
      `SELECT ${statusProjection} AS status,COUNT(*) AS count FROM email_deliveries e WHERE ${scope} GROUP BY 1`,
      scopeValues,
    ),
    pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from} WHERE ${where}`, values),
  ]);
  const counts = { sending: 0, sent: 0, failed: 0, unknown: 0 };
  for (const row of metricRows) counts[row.status] = Number(row.count);
  return { deliveries, counts, total: Number(numbers[0].total), pageSize: 30 };
}
export async function emailQuotation(
  actor: AuthUser,
  quotationId: string,
  input: {
    shareId: string;
    token: string;
    locale: 'en' | 'ar';
    attachPdf: boolean;
    requestKey: string;
  },
) {
  await readQuotation(quotationId, actor);
  const share = await readPublicQuotation(input.shareId, input.token);
  if (share.document.id !== quotationId || share.superseded)
    throw new HttpError(409, 'QUOTATION_SHARE_OUTDATED');
  const recipient = z.email().max(254).safeParse(share.document.customer?.email);
  if (!recipient.success) throw new HttpError(409, 'CUSTOMER_EMAIL_REQUIRED');
  const digest = createHash('sha256')
    .update(
      JSON.stringify([actor.id, input.shareId, recipient.data, input.locale, input.attachPdf]),
    )
    .digest('hex');
  const [requests] = await pool.execute<RowDataPacket[]>(
    `SELECT e.id,e.request_digest,${statusProjection} AS status FROM email_deliveries e WHERE e.request_key=?`,
    [input.requestKey],
  );
  if (requests[0]) {
    if (requests[0].request_digest !== digest) throw new HttpError(409, 'EMAIL_REQUEST_CONFLICT');
    return { id: requests[0].id as string, status: requests[0].status as EmailStatus };
  }
  const smtp = await smtpTransport();
  const document = share.document;
  const arabic = input.locale === 'ar';
  const subject =
    `${arabic ? 'عرض سعر' : 'Travel quotation'} ${document.reference} · ${document.branding.projectName}`
      .replace(/\p{Cc}/gu, ' ')
      .slice(0, 240);
  const attachment = input.attachPdf ? await renderQuotationPdf(document, input.locale) : null;
  if (attachment && attachment.length > 20 * 1024 * 1024)
    throw new HttpError(413, 'EMAIL_PDF_TOO_LARGE');
  const link = `${env.APP_ORIGIN}/q/${input.shareId}#token=${input.token}`;
  const id = randomUUID();
  let inserted = false;
  try {
    await pool
      .execute(
        `INSERT INTO email_deliveries (id,quotation_share_id,actor_id,request_key,request_digest,recipient_email,subject,status)
      SELECT ?,?,?,?,?,?,?,'sending' FROM quotation_shares WHERE id=? AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP(6)`,
        [
          id,
          input.shareId,
          actor.id,
          input.requestKey,
          digest,
          recipient.data,
          subject,
          input.shareId,
        ],
      )
      .then(([result]) => {
        inserted = 'affectedRows' in result && result.affectedRows === 1;
      });
  } catch (error) {
    smtp.transport.close();
    if ((error as { code?: string } | null)?.code === 'ER_DUP_ENTRY')
      throw new HttpError(409, 'EMAIL_REQUEST_IN_PROGRESS');
    throw error;
  }
  if (!inserted) {
    smtp.transport.close();
    throw new HttpError(409, 'QUOTATION_SHARE_OUTDATED');
  }
  let status: EmailStatus = 'unknown';
  let providerId: string | null = null;
  try {
    const response = await smtp.transport.sendMail({
      from: smtp.from,
      replyTo: smtp.replyTo,
      to: recipient.data,
      subject,
      text: arabic
        ? `يمكنك الاطّلاع على عرض السعر ${document.reference} من الرابط التالي:

${link}`
        : `View travel quotation ${document.reference} at the following link:

${link}`,
      attachments: attachment
        ? [
            {
              filename: `quotation-${document.reference}-${input.locale}.pdf`,
              content: attachment,
              contentType: 'application/pdf',
            },
          ]
        : [],
    });
    status = response.accepted.length ? 'sent' : 'failed';
    providerId = status === 'sent' ? response.messageId.slice(0, 254) : null;
  } catch (error) {
    const smtpError = error as { code?: string; responseCode?: number };
    if (
      smtpError.code === 'EAUTH' ||
      smtpError.code === 'EENVELOPE' ||
      (smtpError.responseCode && smtpError.responseCode >= 400)
    )
      status = 'failed';
  } finally {
    smtp.transport.close();
  }
  await transaction(async (connection) => {
    await connection.execute(
      'UPDATE email_deliveries SET status=?,provider_id=?,finished_at=UTC_TIMESTAMP(6) WHERE id=?',
      [status, providerId, id],
    );
    await writeAuditEvent(connection, {
      actorId: actor.id,
      action: `emails.${status}`,
      entityType: 'email_delivery',
      entityId: id,
      module: 'emails',
      severity: status === 'sent' ? 'info' : 'warning',
      outcome: status === 'sent' ? 'success' : 'failure',
    });
  });
  return { id, status };
}
