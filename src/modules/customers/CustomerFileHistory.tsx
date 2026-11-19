import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  CustomerFilePage,
  CustomerFileSection,
} from '../../../shared/crm/customer-file.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { DataState } from '../../components/ui/DataState';
import { StatusBadge, type BadgeVariant } from '../../components/ui/StatusBadge';
import { useApiResource } from '../../lib/http/useApiResource';
import { getIntlLocale } from '../../localization/config';
import { formatDate, formatDateTime, formatNumber } from '../../utils/format';
import { auditLabel } from '../audit/audit.format';
import { crmLabel } from '../crm/crm.labels';
import { useQuotationText } from '../quotations/quotation.labels';

const labels: Record<string, [string, string]> = {
  lead: ['Lead', 'ليد'],
  customer: ['Customer', 'عميل'],
  quotation: ['Quotation', 'كوتيشن'],
  booking: ['Booking', 'حجز'],
  email: ['Email', 'بريد إلكتروني'],
  message: ['Chat', 'محادثة'],
  payment: ['Payment', 'دفعة'],
  invoice: ['Invoice', 'فاتورة'],
  incoming: ['Incoming', 'واردة'],
  outgoing: ['Outgoing', 'صادرة'],
  received: ['Received', 'تم الاستلام'],
  sent: ['Sent', 'تم الإرسال'],
  delivered: ['Delivered', 'تم التسليم'],
  read: ['Read', 'مقروءة'],
  sending: ['Sending', 'جارٍ الإرسال'],
  failed: ['Failed', 'فشل'],
  unknown: ['Unconfirmed', 'غير مؤكد'],
  pending: ['Pending', 'معلق'],
  confirmed: ['Confirmed', 'مؤكد'],
  completed: ['Completed', 'مكتمل'],
  cancelled: ['Cancelled', 'ملغى'],
  verified: ['Verified', 'مؤكد'],
  issued: ['Issued', 'صادرة'],
  void: ['Void', 'ملغى'],
  customer_receipt: ['Receipt', 'تحصيل'],
  customer_refund: ['Refund', 'رد مبلغ'],
  invoice_recorded: ['Invoice recorded', 'تم تسجيل فاتورة'],
  link_created: ['Share link created', 'تم إنشاء رابط مشاركة'],
  link_revoked: ['Share link revoked', 'تم إلغاء رابط المشاركة'],
};

const tones: Record<string, BadgeVariant> = {
  cancelled: 'rose',
  failed: 'rose',
  void: 'rose',
  declined: 'rose',
  verified: 'emerald',
  confirmed: 'emerald',
  completed: 'emerald',
  delivered: 'emerald',
  read: 'emerald',
  issued: 'emerald',
  pending: 'amber',
  sending: 'amber',
  unknown: 'amber',
};

const rowLink =
  'rounded font-semibold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300';
const pageLink =
  'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:hover:bg-slate-800';

interface TableRow {
  key: string;
  cells: ReactNode[];
}
type Copy = ReturnType<typeof useQuotationText>;

function historyTable(data: CustomerFilePage, copy: Copy) {
  const { t, text, label, locale, isRTL } = copy;
  const named = (value: string) => (labels[value] ? text(...labels[value]) : label(value));
  const date = (value: string | null) => (value ? <bdi>{formatDate(value, { locale })}</bdi> : '—');
  const time = (value: string | null) =>
    value ? <bdi>{formatDateTime(value, { locale })}</bdi> : '—';
  const money = (amount: string, currency: string) => (
    <bdi className="whitespace-nowrap">
      {formatFinanceMoney(amount, currency, getIntlLocale(locale))} · {currency}
    </bdi>
  );
  const badge = (status: string, name = named(status)) => (
    <StatusBadge variant={tones[status] ?? 'blue'}>{name}</StatusBadge>
  );
  const reference = (path: string, name: string) => (
    <Link className={rowLink} to={path}>
      <bdi>{name}</bdi>
    </Link>
  );
  const status = text('Status', 'الحالة');
  const createdAt = text('Recorded at', 'تاريخ التسجيل');
  const rows = <Row extends { id: string }>(
    records: Row[],
    cells: (row: Row) => ReactNode[],
  ): TableRow[] => records.map((row) => ({ key: row.id, cells: cells(row) }));

  switch (data.section) {
    case 'timeline':
      return {
        headers: [
          createdAt,
          text('Type', 'النوع'),
          text('Activity', 'النشاط'),
          text('Reference', 'المرجع'),
          text('By', 'بواسطة'),
        ],
        rows: rows(data.rows, (row) => [
          time(row.createdAt),
          badge(row.category),
          row.category === 'email' && row.event === 'sent'
            ? text('Accepted by mail server', 'قبله خادم البريد')
            : labels[row.event]
              ? named(row.event)
              : auditLabel(row.event, t),
          <bdi>{row.reference || '—'}</bdi>,
          row.operator || '—',
        ]),
      };
    case 'leads':
      return {
        headers: [
          text('Lead', 'الليد'),
          text('Source', 'المصدر'),
          status,
          text('Assigned to', 'المسؤول'),
          createdAt,
          text('Converted at', 'تاريخ التحويل'),
        ],
        rows: rows(data.rows, (row) => [
          <div>
            <bdi>{row.name}</bdi>
            <div className="text-xs">{reference(`/leads/${row.id}`, `LD-${row.id}`)}</div>
          </div>,
          crmLabel(row.source, isRTL),
          <div className="flex flex-wrap gap-1">
            {badge(row.status, crmLabel(row.status, isRTL))}
            {row.archivedAt && <StatusBadge>{text('Archived', 'مؤرشف')}</StatusBadge>}
          </div>,
          row.assignedName || '—',
          time(row.createdAt),
          time(row.convertedAt),
        ]),
      };
    case 'quotations':
      return {
        headers: [
          text('Quotation', 'الكوتيشن'),
          text('Revision', 'النسخة'),
          status,
          text('Share links', 'روابط المشاركة'),
          text('Email accepted at', 'وقت قبول إرسال البريد'),
          createdAt,
        ],
        rows: data.rows.map((row) => ({
          key: `${row.id}:${row.version}`,
          cells: [
            <div>
              {reference(`/quotations/${row.id}?version=${row.version}`, row.reference)}
              <div className="text-xs" dir="auto">
                {(isRTL ? row.titleAr || row.titleEn : row.titleEn || row.titleAr) || '—'}
              </div>
            </div>,
            formatNumber(row.version, { locale }),
            row.status ? (
              badge(row.status)
            ) : (
              <StatusBadge>{text('Previous revision', 'نسخة سابقة')}</StatusBadge>
            ),
            formatNumber(row.sharedLinks, { locale }),
            row.lastSentAt
              ? time(row.lastSentAt)
              : text('No accepted email recorded', 'لا يوجد بريد مقبول للإرسال'),
            time(row.createdAt),
          ],
        })),
      };
    case 'bookings':
      return {
        headers: [
          text('Booking', 'الحجز'),
          text('Quotation', 'الكوتيشن'),
          status,
          text('Travel dates', 'مواعيد الرحلة'),
          text('Booking value', 'قيمة الحجز'),
          createdAt,
        ],
        rows: rows(data.rows, (row) => [
          reference(`/bookings/${row.id}`, row.reference),
          <span>
            <bdi>{row.quotationReference}</bdi> · {text('v', 'نسخة ')}
            {formatNumber(row.quotationVersion, { locale })}
          </span>,
          badge(row.status),
          <span className="whitespace-nowrap">
            {date(row.startDate)}
            {row.endDate && <> – {date(row.endDate)}</>}
          </span>,
          money(row.amount, row.currency),
          time(row.createdAt),
        ]),
      };
    case 'payments':
      return {
        headers: [
          text('Booking', 'الحجز'),
          text('Transaction', 'المعاملة'),
          status,
          text('Amount', 'المبلغ'),
          text('Method', 'الطريقة'),
          text('Reference', 'المرجع'),
          text('Settled on', 'تاريخ التسوية'),
          createdAt,
        ],
        rows: rows(data.rows, (row) => [
          <bdi>{row.bookingReference}</bdi>,
          named(row.purpose),
          badge(row.status),
          money(row.amount, row.currency),
          row.method,
          <bdi>{row.reference || '—'}</bdi>,
          date(row.settledOn),
          time(row.createdAt),
        ]),
      };
    case 'invoices':
      return {
        headers: [
          text('Invoice', 'الفاتورة'),
          text('Booking', 'الحجز'),
          status,
          text('Amount', 'المبلغ'),
          text('Due on', 'الاستحقاق'),
          createdAt,
        ],
        rows: rows(data.rows, (row) => [
          reference(
            `/finance/invoices/${row.id}`,
            row.number ?? `${text('Draft', 'مسودة')} #${row.id}`,
          ),
          <bdi>{row.bookingReference || '—'}</bdi>,
          badge(row.status),
          money(row.amount, row.currency),
          date(row.dueOn),
          time(row.createdAt),
        ]),
      };
    case 'inbox':
      return {
        headers: [
          text('Message', 'الرسالة'),
          text('Channel', 'القناة'),
          text('Direction', 'الاتجاه'),
          status,
          createdAt,
        ],
        rows: rows(data.rows, (row) => [
          <div className="min-w-48 max-w-xl whitespace-pre-wrap break-words" dir="auto">
            {row.body}
          </div>,
          reference(`/inbox?thread=${row.threadId}`, t(`inbox.channels.${row.channel}`)),
          named(row.direction),
          badge(row.delivery),
          time(row.createdAt),
        ]),
      };
    case 'emails':
      return {
        headers: [
          text('Subject', 'الموضوع'),
          text('Recipient', 'المستلم'),
          text('Quotation revision', 'نسخة الكوتيشن'),
          status,
          createdAt,
          text('Finished at', 'وقت انتهاء المحاولة'),
        ],
        rows: rows(data.rows, (row) => [
          <span className="break-words" dir="auto">
            {row.subject}
          </span>,
          <bdi>{row.recipient}</bdi>,
          <span>
            <bdi>{row.quotationReference}</bdi> · {formatNumber(row.quotationVersion, { locale })}
          </span>,
          badge(
            row.status,
            row.status === 'sent' ? text('Accepted by mail server', 'قبله خادم البريد') : undefined,
          ),
          time(row.createdAt),
          time(row.finishedAt),
        ]),
      };
  }
}

export function CustomerFileHistory({
  customerId,
  section,
  page,
  title,
}: {
  customerId: string;
  section: CustomerFileSection;
  page: number;
  title: string;
}) {
  const copy = useQuotationText();
  const { text, locale } = copy;
  const resource = useApiResource<CustomerFilePage>(
    `/crm/customers/${customerId}/file/${section}?page=${page}`,
  );
  const data = resource.error ? null : resource.data;
  const table = data?.rows.length ? historyTable(data, copy) : null;
  const path = `/customers/${customerId}?section=${section}&page=`;
  return (
    <section aria-labelledby="customer-file-section">
      <h2 id="customer-file-section" className="mb-4 text-lg font-bold">
        {title}
      </h2>
      {table && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table aria-labelledby="customer-file-section" className="table-premium w-full">
            <thead>
              <tr>
                {table.headers.map((heading) => (
                  <th key={heading} scope="col">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <td key={table.headers[index]}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DataState {...resource} empty={data?.rows.length === 0} retry={resource.reload} />
      {data && (data.page > 1 || data.hasMore) && (
        <nav
          aria-label={text('History pages', 'صفحات السجل')}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          {data.page > 1 && (
            <Link className={pageLink} to={path + (data.page - 1)}>
              {text('Previous', 'السابق')}
            </Link>
          )}
          <span className="text-sm text-slate-500">
            {text('Page', 'الصفحة')} {formatNumber(data.page, { locale })}
          </span>
          {data.hasMore && data.page < 10000 && (
            <Link className={pageLink} to={path + (data.page + 1)}>
              {text('Next', 'التالي')}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
