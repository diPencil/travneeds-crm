import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { CalendarCheck, CalendarClock, CheckCircle2, Plus, XCircle } from 'lucide-react';
import {
  bookingStatuses,
  bookingTransitions,
  type Booking,
  type BookingDirectory,
  type BookingStatus,
} from '../../../shared/bookings/booking.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import type { QuotationSummary } from '../../../shared/quotations/quotation.contracts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { DataState } from '../../components/ui/DataState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { useToastContext } from '../../hooks/useToastContext';
import { useQuotationText } from '../quotations/quotation.labels';

const statusLabels = {
  pending: ['Pending', 'قيد الانتظار'],
  confirmed: ['Confirmed', 'مؤكد'],
  completed: ['Completed', 'مكتمل'],
  cancelled: ['Cancelled', 'ملغى'],
} as const;
const icons = {
  pending: CalendarClock,
  confirmed: CalendarCheck,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function BookingsPage() {
  const { text, isRTL } = useQuotationText();
  const [parameters] = useSearchParams();
  const customerId = parameters.get('customerId');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ search, page: String(page) });
  if (status) query.set('status', status);
  if (customerId) query.set('customerId', customerId);
  const resource = useApiResource<BookingDirectory>(`/bookings?${query}`);
  const data = resource.error ? null : resource.data;
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={text('Travel Bookings', 'حجوزات السفر')}
        description={text(
          'Follow bookings from quotation to completion.',
          'تابع الحجوزات من الكوتيشن إلى اكتمال الرحلة.',
        )}
        actions={
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-600"
            to={`/bookings/new${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ''}`}
          >
            <Plus size={16} />
            {text('New Booking', 'حجز جديد')}
          </Link>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {bookingStatuses.map((key) => (
          <StatCard
            key={key}
            label={text(statusLabels[key][0], statusLabels[key][1])}
            value={data?.counts[key] ?? '—'}
            icon={icons[key]}
          />
        ))}
      </div>
      {!!data?.totals.length && (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <h2 className="font-bold">
            {text('Confirmed and completed totals', 'إجمالي الحجوزات المؤكدة والمكتملة')}
          </h2>
          {data.totals.map((total) => (
            <bdi key={total.currency} className="font-semibold">
              {formatFinanceMoney(total.amount, total.currency, isRTL ? 'ar-EG' : 'en-US')}
            </bdi>
          ))}
        </div>
      )}
      <div className="grid gap-4 rounded-3xl bg-white p-5 dark:bg-gray-900 sm:grid-cols-[1fr_15rem]">
        <Input
          aria-label={text('Search', 'بحث')}
          placeholder={text(
            'Search booking, quotation or customer',
            'ابحث بالحجز أو الكوتيشن أو العميل',
          )}
          value={search}
          maxLength={120}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label={text('Status', 'الحالة')}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{text('All statuses', 'كل الحالات')}</option>
          {bookingStatuses.map((key) => (
            <option key={key} value={key}>
              {text(statusLabels[key][0], statusLabels[key][1])}
            </option>
          ))}
        </Select>
      </div>
      <div className="table-container">
        <table className="table-premium">
          <thead>
            <tr>
              {[
                text('Booking', 'الحجز'),
                text('Customer', 'العميل'),
                text('Quotation', 'الكوتيشن'),
                text('Travel date', 'تاريخ السفر'),
                text('Total', 'الإجمالي'),
                text('Status', 'الحالة'),
              ].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.bookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <Link className="font-bold text-blue-600" to={`/bookings/${booking.id}`}>
                    <bdi>{booking.reference}</bdi>
                  </Link>
                  <p className="mt-1 text-sm">
                    {booking.title[isRTL ? 'ar' : 'en'] || booking.title[isRTL ? 'en' : 'ar']}
                  </p>
                </td>
                <td>{booking.customerName}</td>
                <td>
                  <bdi>{booking.quotationReference}</bdi>
                </td>
                <td>
                  <bdi>{booking.startDate}</bdi>
                </td>
                <td>
                  <bdi>
                    {formatFinanceMoney(booking.total, booking.currency, isRTL ? 'ar-EG' : 'en-US')}
                  </bdi>
                </td>
                <td>
                  <StatusBadge
                    variant={
                      booking.status === 'cancelled'
                        ? 'rose'
                        : booking.status === 'pending'
                          ? 'blue'
                          : 'emerald'
                    }
                  >
                    {text(statusLabels[booking.status][0], statusLabels[booking.status][1])}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DataState {...resource} empty={!data?.bookings.length} retry={resource.reload} />
      </div>
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            {text('Previous', 'السابق')}
          </Button>
          <bdi>
            {page} / {Math.ceil(data.total / data.pageSize)}
          </bdi>
          <Button
            variant="outline"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage(page + 1)}
          >
            {text('Next', 'التالي')}
          </Button>
        </div>
      )}
    </div>
  );
}

type Candidate = Pick<
  QuotationSummary,
  'id' | 'reference' | 'version' | 'customerName' | 'total' | 'currency'
>;
export function NewBookingPage() {
  const { text, isRTL } = useQuotationText();
  const { csrfToken } = useAuth();
  const toast = useToastContext();
  const navigate = useNavigate();
  const [parameters] = useSearchParams();
  const initialId = parameters.get('quotationId');
  const [selection, setSelection] = useState(initialId ?? '');
  const [search, setSearch] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = new URLSearchParams({ search });
  const customerId = parameters.get('customerId');
  if (customerId) query.set('customerId', customerId);
  const candidates = useApiResource<{ quotations: Candidate[] }>(
    initialId ? null : `/bookings/candidates?${query}`,
  );
  const direct = useApiResource<QuotationSummary>(
    initialId ? `/quotations/${encodeURIComponent(initialId)}` : null,
  );
  const selected = initialId
    ? direct.data
    : candidates.data?.quotations.find((item) => item.id === selection);
  const canBook =
    selected && (!initialId || ['ready', 'sent', 'accepted'].includes(direct.data?.status ?? ''));
  const resource = initialId ? direct : candidates;
  async function submit() {
    if (!selected || !canBook || !csrfToken || busy) return;
    setBusy(true);
    setError('');
    try {
      const booking = await apiRequest<Booking>('/bookings', {
        method: 'POST',
        csrfToken,
        body: { quotationId: selected.id, quotationVersion: selected.version, requestKey },
      });
      toast.success(text('Booking created.', 'تم إنشاء الحجز.'));
      navigate(`/bookings/${booking.id}`, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? text(
              'This version cannot be booked. Check the quotation status, expiry, and any unpriced extras.',
              'الإصدار ده غير قابل للحجز. راجع الحالة والصلاحية والإضافات اللي سعرها حسب الطلب.',
            )
          : text('Booking could not be saved. Try again.', 'تعذّر حفظ الحجز. حاول مرة تانية.'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={text('New Booking', 'حجز جديد')}
        description={text(
          'Choose a saved quotation to create a pending booking.',
          'اختار كوتيشن محفوظ لإنشاء حجز قيد الانتظار.',
        )}
      />
      <div className="max-w-3xl space-y-5 rounded-3xl bg-white p-6 dark:bg-gray-900">
        <DataState {...resource} retry={resource.reload} />
        {!initialId && (
          <>
            <Input
              aria-label={text('Find quotations', 'بحث الكوتيشنات')}
              placeholder={text(
                'Search by quotation reference or customer',
                'ابحث برقم الكوتيشن أو العميل',
              )}
              value={search}
              maxLength={120}
              disabled={busy}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              aria-label={text('Quotation', 'الكوتيشن')}
              value={selection}
              disabled={busy}
              onChange={(event) => {
                setSelection(event.target.value);
                setRequestKey(crypto.randomUUID());
              }}
            >
              <option value="">
                {text('Select an eligible quotation', 'اختار كوتيشن جاهز للحجز')}
              </option>
              {candidates.data?.quotations.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.reference} · {quote.customerName}
                </option>
              ))}
            </Select>
            <DataState
              {...candidates}
              empty={!candidates.data?.quotations.length}
              retry={candidates.reload}
            />
          </>
        )}
        {selected && (
          <dl className="grid gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800 sm:grid-cols-3">
            <div>
              <dt>{text('Quotation', 'الكوتيشن')}</dt>
              <dd>
                <bdi>
                  {selected.reference} · v{selected.version}
                </bdi>
              </dd>
            </div>
            <div>
              <dt>{text('Customer', 'العميل')}</dt>
              <dd>{selected.customerName}</dd>
            </div>
            <div>
              <dt>{text('Total', 'الإجمالي')}</dt>
              <dd>
                <bdi>
                  {formatFinanceMoney(selected.total, selected.currency, isRTL ? 'ar-EG' : 'en-US')}
                </bdi>
              </dd>
            </div>
          </dl>
        )}
        {selected && !canBook && (
          <p>
            {text(
              'This quotation cannot be booked in its current status.',
              'حالة الكوتيشن الحالية لا تسمح بإنشاء حجز.',
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-600">
            {error}
          </p>
        )}
        <Button
          disabled={!canBook || busy || resource.loading || Boolean(resource.error)}
          onClick={() => void submit()}
        >
          <Plus size={16} />
          {text('Create Booking', 'إنشاء الحجز')}
        </Button>
      </div>
    </div>
  );
}

export function BookingDetailsPage() {
  const { id } = useParams();
  const { text, isRTL } = useQuotationText();
  const { csrfToken, user } = useAuth();
  const resource = useApiResource<Booking>(id ? `/bookings/${encodeURIComponent(id)}` : null);
  const booking = resource.error ? null : resource.data;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function changeStatus(status: BookingStatus) {
    if (!booking || !csrfToken || busy) return;
    if (status === 'cancelled' && !window.confirm(text('Cancel this booking?', 'تلغي الحجز ده؟')))
      return;
    setError('');
    setBusy(true);
    try {
      await apiRequest(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        csrfToken,
        body: { status, version: booking.version },
      });
      resource.reload();
    } catch {
      setError(
        text(
          'Status could not be updated. Refresh and try again.',
          'تعذّر تحديث الحالة. حدّث الصفحة وحاول مرة تانية.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const actions = {
    pending: '',
    confirmed: text('Confirm booking', 'تأكيد الحجز'),
    completed: text('Complete booking', 'إكمال الحجز'),
    cancelled: text('Cancel booking', 'إلغاء الحجز'),
  };
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={booking?.reference ?? text('Booking', 'الحجز')}
        description={
          booking ? text(statusLabels[booking.status][0], statusLabels[booking.status][1]) : ''
        }
      />
      <DataState {...resource} retry={resource.reload} />
      {booking && (
        <div className="space-y-6 rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h2 className="text-lg font-bold">
            {booking.title[isRTL ? 'ar' : 'en'] || booking.title[isRTL ? 'en' : 'ar']}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt>{text('Customer', 'العميل')}</dt>
              <dd>{booking.customerName}</dd>
            </div>
            <div>
              <dt>{text('Quotation', 'الكوتيشن')}</dt>
              <dd>
                <Link
                  className="text-blue-600"
                  to={`/quotations/${booking.quotationId}?version=${booking.quotationVersion}`}
                >
                  <bdi>
                    {booking.quotationReference} · v{booking.quotationVersion}
                  </bdi>
                </Link>
              </dd>
            </div>
            <div>
              <dt>{text('Travel dates', 'تواريخ السفر')}</dt>
              <dd>
                <bdi>{[booking.startDate, booking.endDate].filter(Boolean).join(' – ')}</bdi>
              </dd>
            </div>
            <div>
              <dt>{text('Total', 'الإجمالي')}</dt>
              <dd>
                <bdi>
                  {formatFinanceMoney(booking.total, booking.currency, isRTL ? 'ar-EG' : 'en-US')}
                </bdi>
              </dd>
            </div>
          </dl>
          {error && (
            <p role="alert" className="text-rose-600">
              {error}{' '}
              <button type="button" className="underline" onClick={resource.reload}>
                {text('Refresh', 'تحديث')}
              </button>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {bookingTransitions[booking.status].map((next) => (
              <Button
                key={next}
                variant={next === 'cancelled' ? 'outline' : 'primary'}
                disabled={busy || resource.loading}
                onClick={() => void changeStatus(next)}
              >
                {actions[next]}
              </Button>
            ))}
            {user?.roles.includes('admin') && (
              <Link
                className="font-semibold text-blue-600"
                to={`/finance/bookings/${booking.financeId}`}
              >
                {text('Open finance record', 'فتح السجل المالي')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
