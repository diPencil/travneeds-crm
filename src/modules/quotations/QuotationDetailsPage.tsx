import { SendQuotationEmail } from '../emails/SendQuotationEmail';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FileDown, Pencil, Share2, CheckCircle2 } from 'lucide-react';
import type { QuotationDocument } from '../../../shared/quotations/quotation.contracts';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataState } from '../../components/ui/DataState';
import { AccountDialog } from '../../components/ui/AccountDialog';
import { QuotationFrame } from './QuotationFrame';
import { downloadQuotationPdf } from './quotation.api';
import { useQuotationText } from './quotation.labels';

interface ShareRow {
  id: string;
  version: number;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}
export function QuotationDetailsPage() {
  const { id } = useParams();
  const { text, label } = useQuotationText();
  const { csrfToken } = useAuth();
  const [query] = useSearchParams();
  const historicalVersion = query.get('version');
  const resource = useApiResource<QuotationDocument>(
    `/quotations/${id}${historicalVersion ? `?version=${encodeURIComponent(historicalVersion)}` : ''}`,
  );
  const booking = useApiResource<{ id: string }>(
    resource.data?.status === 'booked' ? `/bookings/quotation/${id}` : null,
  );
  const [updated, setUpdated] = useState<QuotationDocument | null>(null);
  const document = resource.error ? null : (updated ?? resource.data);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const presentation = useApiResource<{ html: string }>(
    document
      ? `/quotations/${id}/presentation?version=${document.version}&locale=${language}`
      : null,
  );
  const shares = useApiResource<{ shares: ShareRow[] }>(
    document ? `/quotations/${id}/shares` : null,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [expiry, setExpiry] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  );
  const canShare = document && ['ready', 'sent', 'accepted', 'booked'].includes(document.status);
  async function status(value: 'ready' | 'sent' | 'accepted' | 'declined' | 'draft') {
    if (!document || !csrfToken || busy) return;
    setBusy(true);
    setFeedback('');
    try {
      setUpdated(
        await apiRequest<QuotationDocument>(`/quotations/${id}/status`, {
          method: 'POST',
          csrfToken,
          body: { status: value, version: document.version, requestKey: crypto.randomUUID() },
        }),
      );
    } catch (error) {
      setFeedback(
        error instanceof ApiError && error.code === 'RECORD_CHANGED'
          ? text(
              'Quotation changed. Reload before updating.',
              'الكوتيشن اتغير. أعد تحميله قبل التحديث.',
            )
          : text(
              'Could not update. Complete required customer, dates and pricing first.',
              'تعذّر التحديث. أكمل العميل والتواريخ والتسعير المطلوب أولًا.',
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!document || !csrfToken || busy) return;
    setBusy(true);
    setFeedback('');
    try {
      const result = await apiRequest<{ url: string }>(`/quotations/${id}/shares`, {
        method: 'POST',
        csrfToken,
        body: { version: document.version, expiresAt: new Date(expiry + 'Z').toISOString() },
      });
      setUrl(result.url);
      shares.reload();
    } catch {
      setFeedback(
        text(
          'Could not create the link. Use a ready quotation and an expiry within 30 days.',
          'تعذّر إنشاء الرابط. استخدم عرضًا جاهزًا وصلاحية خلال 30 يومًا.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function revoke(shareId: string) {
    if (!csrfToken || busy) return;
    setBusy(true);
    try {
      await apiRequest(`/quotations/${id}/shares/${shareId}`, { method: 'DELETE', csrfToken });
      shares.reload();
      setUrl('');
    } catch {
      setFeedback(text('Could not revoke the link.', 'تعذّر إلغاء الرابط.'));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!document || busy) return;
    setBusy(true);
    setFeedback('');
    try {
      await downloadQuotationPdf(
        `/quotations/${id}/pdf?version=${document.version}&locale=${language}`,
        `quotation-${document.reference}-${language}.pdf`,
      );
    } catch {
      setFeedback(
        text(
          'Could not prepare the PDF. Retry or ask an administrator to check the PDF service.',
          'تعذّر تجهيز PDF. حاول مرة أخرى أو اطلب من الأدمن مراجعة خدمة PDF.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full pb-8 space-y-6">
      <PageHeader
        title={document?.reference ?? text('Quotation', 'الكوتيشن')}
        description={
          document
            ? `${text('Version', 'إصدار')} ${document.version} · ${label(document.status)}`
            : ''
        }
        actions={
          <>
            {document &&
              !historicalVersion &&
              ['ready', 'sent', 'accepted'].includes(document.status) && (
                <Link
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
                  to={`/bookings/new?quotationId=${id}`}
                >
                  {text('New Booking', 'حجز جديد')}
                </Link>
              )}
            {booking.data && (
              <Link
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
                to={`/bookings/${booking.data.id}`}
              >
                {text('View Booking', 'عرض الحجز')}
              </Link>
            )}
            {document && !historicalVersion && document.status !== 'booked' && (
              <Link
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold inline-flex gap-2 items-center"
                to={`/quotations/${id}/edit`}
              >
                <Pencil size={16} />
                {text('Edit', 'تعديل')}
              </Link>
            )}
            <Button
              className="bg-white text-blue-600 hover:bg-gray-50"
              disabled={!document || busy}
              onClick={() => void download()}
            >
              <FileDown size={16} />
              {text('Download PDF', 'تحميل PDF')}
            </Button>
          </>
        }
      />
      <DataState {...resource} retry={resource.reload} />
      {feedback && (
        <p role="status" className="text-sm p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          {feedback}
        </p>
      )}
      {document && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 flex flex-wrap gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={!canShare || busy || Boolean(historicalVersion)}
                onClick={() => {
                  setShareOpen(true);
                  setUrl('');
                }}
              >
                <Share2 size={16} />
                {text('Share with customer', 'مشاركة مع العميل')}
              </Button>
              {!historicalVersion && document.status === 'draft' && (
                <Button disabled={busy} onClick={() => void status('ready')}>
                  <CheckCircle2 size={16} />
                  {text('Mark ready', 'تجهيز العرض')}
                </Button>
              )}
              {!historicalVersion && document.status === 'ready' && (
                <Button variant="outline" disabled={busy} onClick={() => void status('sent')}>
                  {text('Mark shared', 'تسجيل المشاركة')}
                </Button>
              )}
              {!historicalVersion && ['ready', 'sent'].includes(document.status) && (
                <Button disabled={busy} onClick={() => void status('accepted')}>
                  {text('Record customer acceptance', 'تسجيل قبول العميل')}
                </Button>
              )}
              {!historicalVersion && ['ready', 'sent', 'accepted'].includes(document.status) && (
                <Button variant="outline" disabled={busy} onClick={() => void status('declined')}>
                  {text('Record decline', 'تسجيل الرفض')}
                </Button>
              )}
            </div>
            <Select
              aria-label={text('Document language', 'لغة المستند')}
              value={language}
              onChange={(event) => setLanguage(event.target.value as 'en' | 'ar')}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </Select>
          </div>
          <DataState {...presentation} retry={presentation.reload} />
          {presentation.data && !presentation.error && (
            <QuotationFrame
              html={presentation.data.html}
              title={text('Quotation presentation', 'عرض الكوتيشن')}
            />
          )}
        </>
      )}
      {shareOpen && (
        <AccountDialog
          title={text('Customer Share Link', 'رابط مشاركة العميل')}
          icon={Share2}
          onClose={() => setShareOpen(false)}
          className="max-w-2xl"
        >
          <div className="p-6 space-y-5">
            <Input
              id="share-expiry"
              label={text('Link expires at (UTC)', 'انتهاء صلاحية الرابط (UTC)')}
              type="datetime-local"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
            <Button disabled={busy || !canShare} loading={busy} onClick={() => void share()}>
              {text('Create protected link', 'إنشاء رابط محمي')}
            </Button>
            {url && (
              <div className="space-y-3">
                <Input
                  id="quotation-share-url"
                  label={text('Link — shown once', 'الرابط — يظهر مرة واحدة')}
                  readOnly
                  value={url}
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(url)
                      .then(() => setFeedback(text('Link copied.', 'تم نسخ الرابط.')))
                      .catch(() =>
                        setFeedback(
                          text(
                            'Copy the link from the field manually.',
                            'انسخ الرابط يدويًا من الحقل.',
                          ),
                        ),
                      );
                  }}
                >
                  {text('Copy link', 'نسخ الرابط')}
                </Button>
                {document && (
                  <SendQuotationEmail
                    key={url}
                    quotationId={document.id}
                    link={url}
                    recipient={document.customer?.email ?? null}
                    locale={language}
                  />
                )}
              </div>
            )}
            <DataState {...shares} retry={shares.reload} />
            {shares.data?.shares.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 text-sm border-t border-gray-100 dark:border-gray-700 pt-3"
              >
                <div>
                  {text('Version', 'إصدار')} {item.version}
                  <p className="text-xs text-gray-500">
                    <bdi>{item.expiresAt}</bdi>
                  </p>
                </div>
                {item.revokedAt ? (
                  <span>{text('Revoked', 'ملغى')}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void revoke(item.id)}
                  >
                    {text('Revoke', 'إلغاء الرابط')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </AccountDialog>
      )}
    </div>
  );
}
