import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { DollarSign, FileText } from 'lucide-react';
import type {
  FinanceBookingDetail,
  FinanceOptions,
} from '../../../shared/finance/finance.contracts';
import { decimalToMinor, formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataState } from '../../components/ui/DataState';
import { formatDate } from '../../utils/format';
import { FinanceHeading, FinanceAvailability } from './FinanceComponents';
import { useFinanceCopy } from './finance.copy';

export function ViewPaymentPage() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const selected = id || query.get('bookingId');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { copy, label, isRTL, locale, intlLocale } = useFinanceCopy();
  const options = useApiResource<FinanceOptions>('/finance/options');
  const detail = useApiResource<FinanceBookingDetail>(
    selected && options.data?.source.status === 'ready'
      ? `/finance/bookings/${encodeURIComponent(selected)}`
      : null,
  );
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  const booking = detail.error || options.error ? undefined : detail.data?.booking;
  const money = (value: string | null) =>
    formatFinanceMoney(value, booking?.currency || '', intlLocale);
  const total = booking ? decimalToMinor(booking.totalAmount) : 0n;
  const progress = booking
    ? Math.max(
        0,
        Math.min(
          100,
          total > 0n ? Number((decimalToMinor(booking.paidAmount) * 100n) / total) : 100,
        ),
      )
    : 0;
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <FinanceHeading
          title={`${copy.viewDetails}${booking ? ` · ${booking.reference}` : ''}`}
          description={booking?.customer || copy.subtitle}
          back
        />
        <FinanceAvailability
          source={options.data?.source}
          currency={booking?.currency || options.data?.baseCurrency}
        />
        <DataState {...options} retry={options.reload} />
        <DataState {...detail} retry={detail.reload} />
        {!booking && !options.loading && !options.error && !detail.loading && !detail.error && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-gray-500">
            {copy.chooseBooking}
          </div>
        )}
        {booking && !detail.error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{copy.financialSummary}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p>
                    {copy.amount}: <bdi className="font-bold">{money(booking.totalAmount)}</bdi>
                  </p>
                  <p>
                    {copy.paid}:{' '}
                    <bdi className="text-emerald-600 font-bold">{money(booking.paidAmount)}</bdi>
                  </p>
                  <p>
                    {copy.balance}:{' '}
                    <bdi className="text-rose-600 font-bold">
                      {money(booking.outstandingBalance)}
                    </bdi>
                  </p>
                  <p>
                    {copy.paymentStatus}:{' '}
                    <StatusBadge
                      variant={
                        booking.paymentStatus === 'fully_paid'
                          ? 'emerald'
                          : booking.paymentStatus === 'overdue'
                            ? 'rose'
                            : 'blue'
                      }
                    >
                      {label(booking.paymentStatus)}
                    </StatusBadge>
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-label={copy.paid}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 mt-6 overflow-hidden"
                >
                  <div style={{ width: `${progress}%` }} className="h-full bg-green-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{copy.paymentHistory}</h2>
                <div className="space-y-4">
                  {detail.data?.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap gap-4 items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-50 dark:bg-green-900/50 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium bidi-isolate">{money(payment.amount)}</p>
                          <p className="text-sm text-gray-500">
                            {label(payment.purpose)} · {label(payment.method)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {copy.reference}: <bdi>{payment.reference || '—'}</bdi>
                          </p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="text-sm">
                          {payment.settledOn ? formatDate(payment.settledOn, { locale }) : '—'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {copy.processedBy}: {payment.processedBy || '—'}
                        </p>
                        <StatusBadge variant={payment.status === 'verified' ? 'emerald' : 'gray'}>
                          {label(payment.status)}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                  {!detail.data?.payments.length && (
                    <p className="text-sm text-gray-500">{copy.noPayments}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{copy.invoiceHistory}</h2>
                <div className="space-y-4">
                  {detail.data?.invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      className="w-full p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-start focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
                    >
                      <FileText className="w-5 h-5 text-blue-500 mb-2" />
                      <p className="font-bold">{invoice.number || copy.draft}</p>
                      <p className="text-xs text-gray-500">
                        {label(invoice.party)} · {label(invoice.status)}
                      </p>
                      <bdi>{money(invoice.amount)}</bdi>
                    </button>
                  ))}
                  {!detail.data?.invoices.length && (
                    <p className="text-sm text-gray-500">{copy.notIssued}</p>
                  )}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate(`/finance/issue-invoice?bookingId=${booking.id}`)}
              >
                {copy.issueInvoice}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/finance/supplier-invoice?bookingId=${booking.id}`)}
              >
                {copy.supplierInvoice}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
