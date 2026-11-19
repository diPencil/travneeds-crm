import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, PieChart, Eye, FileText, DollarSign } from 'lucide-react';
import type { FinanceOverview, FinanceOptions } from '../../../shared/finance/finance.contracts';
import { paymentStatuses } from '../../../shared/finance/finance.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableActionsDropdown } from '../../components/ui/TableActionsDropdown';
import { DataState } from '../../components/ui/DataState';
import { useCsvExport } from '../../hooks/useCsvExport';
import { formatDate } from '../../utils/format';
import { useFinanceCopy } from './finance.copy';
import { FinanceHeading, FinanceAvailability, FinancePagination } from './FinanceComponents';
import { FinanceMetrics } from './FinanceMetrics';

export function FinancePage() {
  const exportCsv = useCsvExport();
  const { user } = useAuth();
  const { copy, label, intlLocale, locale } = useFinanceCopy();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    agent: '',
    supplier: '',
    currency: '',
    page: '1',
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const query = new URLSearchParams(filters).toString();
  const data = useApiResource<FinanceOverview>('/finance?' + query);
  const options = useApiResource<FinanceOptions>('/finance/options');
  const filter = (key: keyof typeof filters, value: string) =>
    setFilters((previous) => ({ ...previous, page: '1', [key]: value }));
  if (!user?.roles.includes('admin'))
    return <p role="alert">{locale === 'ar' ? 'غير مصرح' : 'Access denied'}</p>;
  const ready = data.data?.source.status === 'ready';
  const bookings = data.data?.bookings ?? [];
  async function exportRows() {
    setExporting(true);
    setExportError('');
    try {
      const result = await apiRequest<FinanceOverview>('/finance/export?' + query);
      exportCsv('financial-bookings.csv', [
        [
          copy.bookingId,
          copy.customer,
          copy.currency,
          copy.amount,
          copy.paid,
          copy.balance,
          copy.netProfit,
          copy.paymentStatus,
        ],
        ...result.bookings.map((booking) => [
          booking.reference,
          booking.customer,
          booking.currency,
          booking.totalAmount,
          booking.paidAmount,
          booking.outstandingBalance,
          booking.profit,
          label(booking.paymentStatus),
        ]),
      ]);
    } catch (error) {
      setExportError(
        error instanceof ApiError && error.code === 'EXPORT_TOO_LARGE'
          ? copy.exportTooLarge
          : copy.exportFailed,
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px]">
        <FinanceHeading
          title={copy.title}
          description={copy.subtitle}
          actions={
            <>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                onClick={() => navigate('/finance/reports')}
              >
                <PieChart className="h-4 w-4" />
                {copy.reports}
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50"
                onClick={() => navigate('/finance/record-payment')}
              >
                <Plus className="h-4 w-4" />
                {copy.recordPayment}
              </Button>
            </>
          }
        />
        <FinanceAvailability source={data.data?.source} currency={data.data?.currency} />
        <FinanceMetrics
          summary={data.error ? null : (data.data?.summary ?? null)}
          currency={data.data?.currency || options.data?.baseCurrency || ''}
        />
        <Card className="card-premium mt-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full relative">
                <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 start-3" />
                <Input
                  aria-label={copy.searchBookings}
                  placeholder={copy.searchBookings}
                  value={filters.search}
                  onChange={(event) => filter('search', event.target.value)}
                  className="ps-10"
                />
              </div>
              <Select
                aria-label={copy.paymentStatus}
                value={filters.status}
                onChange={(event) => filter('status', event.target.value)}
                className="w-full md:w-40"
              >
                <option value="">{copy.allStatus}</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={copy.agent}
                value={filters.agent}
                onChange={(event) => filter('agent', event.target.value)}
                className="w-full md:w-40"
              >
                <option value="">{copy.allAgents}</option>
                {options.data?.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={copy.allSuppliers}
                value={filters.supplier}
                onChange={(event) => filter('supplier', event.target.value)}
                className="w-full md:w-40"
              >
                <option value="">{copy.allSuppliers}</option>
                {options.data?.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                disabled={!ready || data.error}
                loading={exporting}
                onClick={() => void exportRows()}
              >
                <Download className="h-4 w-4" />
                {copy.export}
              </Button>
            </div>
            {options.data && options.data.currencies.length > 1 && (
              <div className="mt-4 max-w-xs">
                <Select
                  aria-label={copy.currency}
                  value={filters.currency}
                  onChange={(event) => filter('currency', event.target.value)}
                >
                  <option value="">{options.data.baseCurrency}</option>
                  {options.data.currencies
                    .filter((currency) => currency !== options.data?.baseCurrency)
                    .map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
        {exportError && (
          <p role="alert" className="text-red-600 mt-4">
            {exportError}
          </p>
        )}
        <div className="table-container mt-6">
          <table className="table-premium">
            <thead>
              <tr>
                {[
                  copy.bookingId,
                  copy.customer,
                  copy.financialSummary,
                  copy.paymentStatus,
                  copy.invoice,
                  copy.profit,
                  copy.actions,
                ].map((text) => (
                  <th key={text}>{text}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.error &&
                bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className={
                      booking.paymentStatus === 'overdue' ? 'bg-rose-50/30 dark:bg-rose-900/5' : ''
                    }
                  >
                    <td>
                      <div className="font-bold bidi-isolate">{booking.reference}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bidi-isolate">
                        {formatDate(booking.bookedAt, { locale })}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{booking.customer}</div>
                      <div className="text-[10px] text-gray-500">
                        {booking.agent || copy.unassigned}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-bold bidi-isolate">
                        {formatFinanceMoney(booking.totalAmount, booking.currency, intlLocale)}
                      </div>
                      <div className="text-[10px] text-emerald-600">
                        {copy.paid}:{' '}
                        <bdi>
                          {formatFinanceMoney(booking.paidAmount, booking.currency, intlLocale)}
                        </bdi>
                      </div>
                      <div className="text-[10px] text-rose-500 font-bold">
                        {copy.balance}:{' '}
                        <bdi>
                          {formatFinanceMoney(
                            booking.outstandingBalance,
                            booking.currency,
                            intlLocale,
                          )}
                        </bdi>
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        variant={
                          booking.paymentStatus === 'fully_paid'
                            ? 'emerald'
                            : booking.paymentStatus === 'overdue'
                              ? 'rose'
                              : booking.paymentStatus === 'deposit_paid'
                                ? 'blue'
                                : 'amber'
                        }
                      >
                        {label(booking.paymentStatus)}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="text-xs font-medium">
                        {booking.invoiceStatus ? label(booking.invoiceStatus) : copy.notIssued}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {booking.invoiceDate ? formatDate(booking.invoiceDate, { locale }) : '—'}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-bold text-blue-600 bidi-isolate">
                        {formatFinanceMoney(booking.profit, booking.currency, intlLocale)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {copy.margin}:{' '}
                        <bdi>
                          {booking.profitMargin === null ? '—' : `${booking.profitMargin}%`}
                        </bdi>
                      </div>
                    </td>
                    <td>
                      <TableActionsDropdown
                        actions={[
                          {
                            label: copy.viewDetails,
                            icon: Eye,
                            onClick: () => navigate(`/finance/bookings/${booking.id}`),
                          },
                          {
                            label: copy.issueInvoice,
                            icon: FileText,
                            onClick: () =>
                              navigate(`/finance/issue-invoice?bookingId=${booking.id}`),
                          },
                          {
                            label: copy.supplierInvoice,
                            icon: DollarSign,
                            onClick: () =>
                              navigate(`/finance/supplier-invoice?bookingId=${booking.id}`),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <DataState {...data} empty={!bookings.length} retry={data.reload} />
        </div>
        {options.error && <DataState {...options} retry={options.reload} />}
        {data.data && <FinancePagination {...data.data} onPage={(page) => filter('page', page)} />}
      </div>
    </div>
  );
}
