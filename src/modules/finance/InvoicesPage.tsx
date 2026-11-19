import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Eye, FileText } from 'lucide-react';
import type { FinanceInvoiceList, FinanceOptions } from '../../../shared/finance/finance.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataState } from '../../components/ui/DataState';
import { formatDate } from '../../utils/format';
import { useCsvExport } from '../../hooks/useCsvExport';
import { useFinanceCopy } from './finance.copy';
import { useInvoiceCopy } from './invoice.copy';
import { FinanceHeading, FinancePagination } from './FinanceComponents';
export function InvoicesPage() {
  const exportCsv = useCsvExport();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { copy, label, isRTL, locale, intlLocale } = useFinanceCopy();
  const invoiceCopy = useInvoiceCopy().copy;
  const [filters, setFilters] = useState({
    search: '',
    party: '',
    invoiceStatus: '',
    currency: '',
    page: '1',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options = useApiResource<FinanceOptions>('/finance/options');
  const query = new URLSearchParams(filters).toString();
  const resource = useApiResource<FinanceInvoiceList>('/finance/invoices?' + query);
  const filter = (key: keyof typeof filters, value: string) =>
    setFilters((previous) => ({ ...previous, page: '1', [key]: value }));
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  async function download() {
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<FinanceInvoiceList>('/finance/invoices/export?' + query);
      exportCsv('invoices.csv', [
        [
          copy.invoiceNumber,
          copy.bookingId,
          copy.party,
          copy.billTo,
          copy.invoiceState,
          copy.currency,
          copy.amount,
          copy.issuedOn,
          copy.dueOn,
        ],
        ...result.invoices.map((invoice) => [
          invoice.number,
          invoice.bookingReference,
          label(invoice.party),
          invoice.billTo,
          label(invoice.status),
          invoice.currency,
          invoice.amount,
          invoice.issuedOn,
          invoice.dueOn,
        ]),
      ]);
    } catch {
      setError(copy.exportFailed);
    } finally {
      setBusy(false);
    }
  }
  const invoices = resource.data?.invoices ?? [];
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <FinanceHeading
          title={copy.invoices}
          description={invoiceCopy.subtitle}
          back
          actions={
            <>
              <Button
                className="bg-white/10 text-white hover:bg-white/20"
                onClick={() => navigate('/finance/supplier-invoice')}
              >
                <FileText size={16} />
                {copy.supplierInvoice}
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50"
                onClick={() => navigate('/finance/issue-invoice')}
              >
                <Plus size={16} />
                {copy.issueInvoice}
              </Button>
            </>
          }
        />
        {resource.data?.source.status === 'pending_trips' && (
          <p className="text-sm text-gray-500">{invoiceCopy.pending}</p>
        )}
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  aria-label={copy.invoiceSearch}
                  placeholder={copy.invoiceSearch}
                  className="ps-10"
                  value={filters.search}
                  onChange={(event) => filter('search', event.target.value)}
                />
              </div>
              <Select
                aria-label={copy.party}
                value={filters.party}
                onChange={(event) => filter('party', event.target.value)}
              >
                <option value="">{copy.allParties}</option>
                <option value="customer">{label('customer')}</option>
                <option value="supplier">{label('supplier')}</option>
              </Select>
              <Select
                aria-label={copy.invoiceState}
                value={filters.invoiceStatus}
                onChange={(event) => filter('invoiceStatus', event.target.value)}
              >
                <option value="">{copy.allStatus}</option>
                {['draft', 'issued', 'void'].map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
              {(options.data?.currencies.length ?? 0) > 1 && (
                <Select
                  aria-label={copy.currency}
                  value={filters.currency || options.data?.baseCurrency}
                  onChange={(event) => filter('currency', event.target.value)}
                >
                  {options.data?.currencies.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </Select>
              )}
              <Button
                variant="outline"
                disabled={!resource.data || resource.error || resource.loading}
                loading={busy}
                onClick={() => void download()}
              >
                <Download size={16} />
                {copy.export}
              </Button>
            </div>
          </CardContent>
        </Card>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="table-container">
          <table className="table-premium">
            <thead>
              <tr>
                {[
                  copy.invoiceNumber,
                  copy.bookingId,
                  copy.billTo,
                  copy.kind,
                  copy.amount,
                  copy.issuedOn,
                  copy.invoiceState,
                  copy.actions,
                ].map((text) => (
                  <th key={text}>{text}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!resource.error &&
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-bold bidi-isolate">{invoice.number || copy.draft}</td>
                    <td className="bidi-isolate">{invoice.bookingReference || '—'}</td>
                    <td>
                      {invoice.billTo}
                      <p className="text-xs text-gray-500">{label(invoice.party)}</p>
                    </td>
                    <td>{label(invoice.kind)}</td>
                    <td className="font-bold bidi-isolate">
                      {formatFinanceMoney(invoice.amount, invoice.currency, intlLocale)}
                    </td>
                    <td>{invoice.issuedOn ? formatDate(invoice.issuedOn, { locale }) : '—'}</td>
                    <td>
                      <StatusBadge
                        variant={
                          invoice.status === 'issued'
                            ? 'emerald'
                            : invoice.status === 'void'
                              ? 'rose'
                              : 'gray'
                        }
                      >
                        {label(invoice.status)}
                      </StatusBadge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={copy.viewDetails}
                        onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <DataState {...resource} empty={!invoices.length} retry={resource.reload} />
        </div>
        {resource.data && (
          <FinancePagination {...resource.data} onPage={(page) => filter('page', page)} />
        )}
      </div>
    </div>
  );
}
