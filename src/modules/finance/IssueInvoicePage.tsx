import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Save, FileText } from 'lucide-react';
import type {
  InvoiceInput,
  InvoiceDocument as Document,
} from '../../../shared/finance/invoice.contracts';
import type {
  FinanceOverview,
  FinanceOptions,
  FinanceBookingDetail,
  FinanceBooking,
} from '../../../shared/finance/finance.contracts';
import { calculateInvoice, type InvoiceTotals } from '../../../shared/finance/invoice-calculation';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useToastContext } from '../../hooks/useToastContext';
import { useBranding } from '../settings/useBranding';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { FinanceHeading } from './FinanceComponents';
import { InvoiceDocument } from './InvoiceDocument';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { useInvoiceCopy } from './invoice.copy';
import type { CrmRecord } from '../../../shared/crm/crm.contracts';

export function IssueInvoicePage() {
  const [query] = useSearchParams();
  const invoiceId = query.get('invoiceId');
  const bookingId = query.get('bookingId');
  const customerId = !invoiceId && !bookingId ? query.get('customerId') : null;
  const { user } = useAuth();
  const { copy, isRTL } = useInvoiceCopy();
  const options = useApiResource<FinanceOptions>('/finance/options');
  const existing = useApiResource<{ invoice: Document }>(
    invoiceId ? `/finance/invoices/${encodeURIComponent(invoiceId)}` : null,
  );
  const booking = useApiResource<FinanceBookingDetail>(
    !invoiceId && bookingId ? `/finance/bookings/${encodeURIComponent(bookingId)}` : null,
  );
  const customer = useApiResource<CrmRecord>(
    customerId ? `/crm/customers/${encodeURIComponent(customerId)}` : null,
  );
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  if (
    options.loading ||
    existing.loading ||
    booking.loading ||
    customer.loading ||
    options.error ||
    existing.error ||
    booking.error ||
    customer.error
  )
    return (
      <>
        <DataState {...options} retry={options.reload} />
        <DataState {...existing} retry={existing.reload} />
        <DataState {...booking} retry={booking.reload} />
        <DataState {...customer} retry={customer.reload} />
      </>
    );
  if (!options.data) return null;
  if (existing.data && existing.data.invoice.status !== 'draft')
    return <p role="alert">{copy.immutable}</p>;
  return (
    <InvoiceEditor
      key={invoiceId || bookingId || customerId || 'new'}
      options={options.data}
      existing={existing.data?.invoice}
      booking={booking.data?.booking}
      defaults={booking.data?.invoiceDefaults}
      customer={customer.data ?? undefined}
    />
  );
}
function InvoiceEditor({
  options,
  existing,
  booking,
  defaults,
  customer,
}: {
  options: FinanceOptions;
  existing?: Document;
  booking?: FinanceBooking;
  defaults?: FinanceBookingDetail['invoiceDefaults'];
  customer?: CrmRecord;
}) {
  const { copy, intlLocale, isRTL } = useInvoiceCopy();
  const toast = useToastContext();
  const { csrfToken } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<'manual' | 'booking'>(() =>
    existing?.bookingId || booking ? 'booking' : 'manual',
  );
  const [form, setForm] = useState<InvoiceInput>(() => ({
    bookingId: existing?.bookingId || booking?.id || '',
    customerId: existing?.customerId || customer?.id || undefined,
    billTo: existing?.billTo || booking?.customer || customer?.fullName || '',
    customerEmail: existing?.customerEmail || defaults?.email || customer?.email || '',
    customerPhone: existing?.customerPhone || defaults?.phone || customer?.phone || '',
    customerAddress: existing?.customerAddress || '',
    issuerAddress: existing?.issuerAddress || '',
    issuerContact: existing?.issuerContact || '',
    currency: existing?.currency || booking?.currency || options.baseCurrency,
    documentDate: existing?.documentDate || new Date().toISOString().slice(0, 10),
    dueOn: existing?.dueOn || booking?.dueOn || '',
    reference: existing?.reference || '',
    discount: existing?.discount || '0.00',
    taxRate: existing?.taxRate || '0.00',
    taxLabel: existing?.taxLabel || '',
    terms: existing?.terms || '',
    notes: existing?.notes || '',
    items: existing?.items.length
      ? existing.items.map(({ description, quantity, unitPrice }) => ({
          description,
          quantity,
          unitPrice,
        }))
      : booking
        ? (defaults?.items ?? [
            { description: booking.reference, quantity: '1', unitPrice: booking.totalAmount },
          ])
        : [{ description: '', quantity: '1', unitPrice: '' }],
  }));
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bookings = useApiResource<FinanceOverview>(
    mode === 'booking' && options.source.status === 'ready'
      ? '/finance?currency=' + form.currency
      : null,
  );
  const change = <K extends keyof InvoiceInput>(key: K, value: InvoiceInput[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  };
  async function selectBooking(selected: FinanceBooking) {
    setLoadingBooking(true);
    setError('');
    try {
      const detail = await apiRequest<FinanceBookingDetail>(`/finance/bookings/${selected.id}`);
      setForm((previous) => ({
        ...previous,
        bookingId: selected.id,
        billTo: selected.customer,
        currency: selected.currency,
        customerEmail: detail.invoiceDefaults?.email ?? '',
        customerPhone: detail.invoiceDefaults?.phone ?? '',
        dueOn: selected.dueOn || '',
        items: detail.invoiceDefaults?.items ?? [
          { description: selected.reference, quantity: '1', unitPrice: selected.totalAmount },
        ],
      }));
    } catch {
      setError(
        intlLocale === 'ar-EG'
          ? 'تعذّر تحميل بنود الحجز. حاول مرة تانية.'
          : 'Booking items could not be loaded. Try again.',
      );
    } finally {
      setLoadingBooking(false);
    }
  }
  let totals: InvoiceTotals | null = null;
  try {
    totals = calculateInvoice(form.items, form.discount, form.taxRate);
  } catch {
    /* Incomplete editor input has no computed totals. */
  }
  const valid = Boolean(
    totals &&
    !loadingBooking &&
    form.billTo.trim() &&
    form.documentDate &&
    (!form.customerEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) &&
    form.items.every((item) => item.description.trim()) &&
    (!form.dueOn || form.dueOn >= form.documentDate) &&
    (Number(form.taxRate) === 0 || form.taxLabel.trim()) &&
    (mode === 'manual' || form.bookingId),
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !csrfToken || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ invoice: Document }>(
        existing ? `/finance/invoices/${existing.id}` : '/finance/invoices',
        {
          method: existing ? 'PATCH' : 'POST',
          csrfToken,
          body: existing ? { ...form, version: existing.version } : { ...form, requestKey },
        },
      );
      toast.success(isRTL ? 'تم حفظ مسودة الفاتورة.' : 'Invoice draft saved.');
      navigate(`/finance/invoices/${result.invoice.id}`);
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.code === 'RECORD_CHANGED'
          ? copy.changed
          : copy.saveFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  const calculated = totals;
  const document: Document | null = calculated
    ? {
        ...form,
        id: existing?.id || '',
        number: null,
        party: 'customer',
        kind: 'standard',
        status: 'draft',
        amount: calculated.total,
        issuedOn: null,
        bookingId: form.bookingId || null,
        bookingReference: form.bookingId
          ? bookings.data?.bookings.find((item) => item.id === form.bookingId)?.reference ||
            booking?.reference ||
            existing?.bookingReference ||
            null
          : null,
        issuerName: existing?.issuerName || branding?.projectName || '',
        issuerLogo: existing?.issuerLogo || branding?.logoUrl || '',
        subtotal: calculated.subtotal,
        taxAmount: calculated.taxAmount,
        discount: calculated.discount,
        version: existing?.version || 1,
        items: form.items.map((item, index) => ({
          ...item,
          amount: calculated.lineAmounts[index],
        })),
      }
    : null;
  const text = (
    key:
      | 'billTo'
      | 'customerEmail'
      | 'customerPhone'
      | 'customerAddress'
      | 'issuerAddress'
      | 'issuerContact'
      | 'reference'
      | 'documentDate'
      | 'dueOn'
      | 'discount'
      | 'taxRate'
      | 'taxLabel',
    label: string,
    type = 'text',
  ) => (
    <Input
      key={key}
      id={`invoice-${key}`}
      label={label}
      type={type}
      value={form[key]}
      required={key === 'billTo' || key === 'documentDate'}
      maxLength={
        {
          billTo: 160,
          customerEmail: 254,
          customerPhone: 40,
          customerAddress: 1000,
          issuerAddress: 1000,
          issuerContact: 500,
          reference: 120,
          documentDate: 10,
          dueOn: 10,
          discount: 20,
          taxRate: 6,
          taxLabel: 60,
        }[key]
      }
      onChange={(event) => change(key, event.target.value)}
    />
  );
  return (
    <div className="w-full pb-8 space-y-6">
      <FinanceHeading
        title={existing ? copy.edit : copy.title}
        description={copy.subtitle}
        back
        actions={
          <Button
            className="bg-white text-blue-600 hover:bg-gray-50"
            onClick={() => setPreview((value) => !value)}
            disabled={!document}
          >
            <Eye size={16} />
            {preview ? copy.editor : copy.preview}
          </Button>
        }
      />
      <form onSubmit={(event) => void save(event)} className="space-y-6">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">
            {error}
          </p>
        )}
        {preview && document ? (
          <InvoiceDocument invoice={document} preview />
        ) : (
          <>
            <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-5">
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <Select
                  id="invoice-source"
                  label={copy.source}
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value as 'manual' | 'booking');
                    change('bookingId', '');
                  }}
                >
                  <option value="manual">{copy.manual}</option>
                  <option
                    value="booking"
                    disabled={
                      options.source.status !== 'ready' ||
                      Boolean(form.customerId && !existing?.bookingId)
                    }
                  >
                    {copy.booking}
                  </option>
                </Select>
                {text('documentDate', copy.date, 'date')}
                {text('dueOn', copy.due, 'date')}
                <Select
                  id="invoice-currency"
                  label={copy.currency}
                  value={form.currency}
                  disabled={Boolean(form.bookingId)}
                  onChange={(event) => change('currency', event.target.value)}
                >
                  {options.invoiceCurrencies.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </Select>
              </div>
              <p className="text-sm text-gray-500">
                {options.source.status === 'ready' ? copy.bookingHelp : copy.pending}
              </p>
              {mode === 'booking' && (
                <>
                  <DataState {...bookings} retry={bookings.reload} />
                  <Select
                    id="invoice-booking"
                    label={copy.booking}
                    value={form.bookingId}
                    disabled={loadingBooking || busy}
                    onChange={(event) => {
                      const selected = bookings.data?.bookings.find(
                        (item) => item.id === event.target.value,
                      );
                      if (selected) void selectBooking(selected);
                      else change('bookingId', '');
                    }}
                  >
                    <option value="">{copy.noBooking}</option>
                    {booking && !bookings.data?.bookings.some((item) => item.id === booking.id) && (
                      <option value={booking.id}>{booking.reference}</option>
                    )}
                    {bookings.data?.bookings.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.reference} · {item.customer}
                      </option>
                    ))}
                  </Select>
                </>
              )}
            </section>
            <div className="grid lg:grid-cols-2 gap-6">
              <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-5">
                <h2 className="font-bold text-lg">{copy.customer}</h2>
                {text('billTo', copy.customerName)}
                <div className="grid sm:grid-cols-2 gap-4">
                  {text('customerEmail', copy.email, 'email')}
                  {text('customerPhone', copy.phone, 'tel')}
                </div>
                {text('customerAddress', copy.address)}
                {text('reference', copy.reference)}
              </section>
              <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-5">
                <h2 className="font-bold text-lg">{copy.issuer}</h2>
                <p className="font-semibold text-blue-600">
                  {existing?.issuerName || branding?.projectName}
                </p>
                {text('issuerAddress', copy.issuerAddress)}
                {text('issuerContact', copy.issuerContact)}
              </section>
            </div>
            <InvoiceItemsEditor
              items={form.items}
              onChange={(items) => change('items', items)}
              totals={totals}
              currency={form.currency}
            />
            <section className="grid lg:grid-cols-2 gap-8 bg-white dark:bg-gray-900 rounded-3xl p-6">
              <div className="space-y-5">
                {(['terms', 'notes'] as const).map((key) => (
                  <div key={key}>
                    <label htmlFor={`invoice-${key}`} className="block text-sm font-medium mb-2">
                      {copy[key]}
                    </label>
                    <textarea
                      id={`invoice-${key}`}
                      value={form[key]}
                      maxLength={key === 'terms' ? 2000 : 4000}
                      rows={3}
                      className="w-full rounded-2xl bg-slate-50 dark:bg-gray-800 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(event) => change(key, event.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  {text('discount', copy.discount)}
                  {text('taxRate', copy.taxRate)}
                  {text('taxLabel', copy.taxLabel)}
                </div>
                <p className="text-xs text-gray-500">{copy.noTax}</p>
                <dl className="space-y-3">
                  {[
                    [copy.subtotal, totals?.subtotal],
                    [copy.tax, totals?.taxAmount],
                    [copy.total, totals?.total],
                  ].map(([name, value], index) => (
                    <div
                      key={name}
                      className={`flex justify-between gap-4 ${index === 2 ? 'border-t border-gray-100 dark:border-gray-800 pt-4 text-xl font-bold text-blue-600' : ''}`}
                    >
                      <dt>{name}</dt>
                      <dd>
                        <bdi>{formatFinanceMoney(value ?? null, form.currency, intlLocale)}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </>
        )}
        {!valid && (
          <p role="status" className="text-sm text-gray-500">
            {copy.invalid}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/finance/invoices')}>
            {copy.cancel}
          </Button>
          <Button type="submit" disabled={!valid || busy} loading={busy}>
            <Save size={16} />
            {copy.save}
          </Button>
        </div>
      </form>
      <p className="text-xs text-gray-500 flex items-center gap-2">
        <FileText size={14} />
        {copy.issueHelp}
      </p>
    </div>
  );
}
