import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useApiResource } from '../../lib/http/useApiResource';
import type { FinanceOptions, FinanceInvoiceList } from '../../../shared/finance/finance.contracts';
import { FinanceEntryFrame, FinanceNotes } from './FinanceEntryFrame';
import { useFinanceCopy } from './finance.copy';
import { DataState } from '../../components/ui/DataState';
import { formatFinanceMoney } from '../../../shared/finance/money';

export function SupplierInvoicePage() {
  const { copy, label, isRTL, intlLocale } = useFinanceCopy();
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const options = useApiResource<FinanceOptions>('/finance/options');
  const invoices = useApiResource<FinanceInvoiceList>('/finance/invoices?party=supplier');
  return (
    <FinanceEntryFrame
      title={copy.supplierInvoice}
      description={copy.supplierHelp}
      saveLabel={copy.saveSupplierInvoice}
    >
      {(booking, bookingInvoices) => (
        <>
          <div
            role="tablist"
            aria-label={copy.invoices}
            className="flex gap-4 border-b border-gray-100 dark:border-gray-800"
          >
            {(['existing', 'new'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`px-4 py-3 font-semibold border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${tab === value ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}`}
              >
                {value === 'existing'
                  ? isRTL
                    ? 'الفواتير الحالية'
                    : 'Existing Invoices'
                  : isRTL
                    ? 'فاتورة جديدة'
                    : 'New Invoice'}
              </button>
            ))}
          </div>
          {tab === 'existing' && (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="table-premium">
                <thead>
                  <tr>
                    {[copy.invoiceNumber, copy.billTo, copy.amount, copy.invoiceState].map(
                      (text) => (
                        <th key={text}>{text}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(booking
                    ? bookingInvoices.filter((invoice) => invoice.party === 'supplier')
                    : invoices.error
                      ? []
                      : (invoices.data?.invoices ?? [])
                  ).map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.number || copy.draft}</td>
                      <td>{invoice.billTo}</td>
                      <td>
                        <bdi>
                          {formatFinanceMoney(invoice.amount, invoice.currency, intlLocale)}
                        </bdi>
                      </td>
                      <td>{label(invoice.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DataState
                {...invoices}
                empty={
                  !(
                    booking
                      ? bookingInvoices.filter((invoice) => invoice.party === 'supplier')
                      : invoices.error
                        ? []
                        : (invoices.data?.invoices ?? [])
                  ).length
                }
                retry={invoices.reload}
              />
            </div>
          )}
          {tab === 'new' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  disabled
                  id="supplier-invoice-party"
                  label={copy.allSuppliers}
                  defaultValue=""
                >
                  <option value="">{copy.allSuppliers}</option>
                  {options.data?.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
                <Input
                  id="supplier-invoice-amount"
                  label={copy.amount}
                  value={booking?.supplierCost || ''}
                  readOnly
                />
                <Input id="supplier-invoice-number" label={copy.invoiceNumber} value="" readOnly />
                <Input
                  id="supplier-invoice-issue"
                  label={copy.issuedOn}
                  type="date"
                  value=""
                  readOnly
                />
                <Input id="supplier-invoice-due" label={copy.dueOn} type="date" value="" readOnly />
                <Select
                  disabled
                  id="supplier-invoice-state"
                  label={copy.invoiceState}
                  defaultValue="draft"
                >
                  {['draft', 'issued', 'void'].map((status) => (
                    <option key={status} value={status}>
                      {label(status)}
                    </option>
                  ))}
                </Select>
              </div>
              <FinanceNotes />
            </>
          )}
        </>
      )}
    </FinanceEntryFrame>
  );
}
