import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import type {
  FinanceOverview,
  FinanceBooking,
  FinanceBookingDetail,
  FinanceInvoice,
} from '../../../shared/finance/finance.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { DataState } from '../../components/ui/DataState';
import { FinanceHeading, FinanceAvailability } from './FinanceComponents';
import { useFinanceCopy } from './finance.copy';

interface EntryFrameProps {
  title: string;
  description: string;
  saveLabel: string;
  children: (booking: FinanceBooking | null, invoices: FinanceInvoice[]) => ReactNode;
}
export function FinanceEntryFrame({ title, description, saveLabel, children }: EntryFrameProps) {
  const { user } = useAuth();
  const { copy, isRTL, intlLocale } = useFinanceCopy();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const bookingId = query.get('bookingId');
  const overview = useApiResource<FinanceOverview>('/finance');
  const detail = useApiResource<FinanceBookingDetail>(
    bookingId && overview.data?.source.status === 'ready'
      ? `/finance/bookings/${encodeURIComponent(bookingId)}`
      : null,
  );
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  const booking = detail.error ? null : (detail.data?.booking ?? null);
  const options = overview.error ? [] : [...(overview.data?.bookings ?? [])];
  if (booking && !options.some((item) => item.id === booking.id)) options.unshift(booking);
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <FinanceHeading title={title} description={description} back />
        <FinanceAvailability
          source={overview.data?.source}
          currency={booking?.currency || overview.data?.currency}
        />
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-6 sm:p-8">
          <p role="status" className="text-sm text-gray-500 mb-6">
            {copy.readOnly}
          </p>
          <DataState {...overview} retry={overview.reload} />
          <DataState {...detail} retry={detail.reload} />
          <div className="space-y-6">
            <Select
              id="finance-booking"
              label={copy.selectBooking}
              value={booking?.id || ''}
              disabled
            >
              <option value="">{copy.selectBookingHint}</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.reference} · {item.customer}
                </option>
              ))}
            </Select>
            {booking && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg grid md:grid-cols-2 gap-4 text-sm">
                <p>
                  {copy.bookingId}: <bdi>{booking.reference}</bdi>
                </p>
                <p>
                  {copy.customer}: {booking.customer}
                </p>
                <p>
                  {copy.amount}:{' '}
                  <bdi>{formatFinanceMoney(booking.totalAmount, booking.currency, intlLocale)}</bdi>
                </p>
                <p>
                  {copy.balance}:{' '}
                  <bdi>
                    {formatFinanceMoney(booking.outstandingBalance, booking.currency, intlLocale)}
                  </bdi>
                </p>
              </div>
            )}
            {children(booking, detail.data?.invoices ?? [])}
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button type="button" variant="outline" onClick={() => navigate('/finance')}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled title={copy.readOnly}>
              <Save className="w-4 h-4" />
              {saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function FinanceNotes() {
  const { copy } = useFinanceCopy();
  return (
    <div>
      <label
        htmlFor="finance-notes"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {copy.notes}
      </label>
      <textarea
        id="finance-notes"
        rows={4}
        disabled
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );
}
