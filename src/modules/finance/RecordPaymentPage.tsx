import { Upload } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FinanceEntryFrame, FinanceNotes } from './FinanceEntryFrame';
import { useFinanceCopy } from './finance.copy';

export function RecordPaymentPage() {
  const { copy, label } = useFinanceCopy();
  return (
    <FinanceEntryFrame
      title={copy.recordPayment}
      description={copy.paymentHelp}
      saveLabel={copy.recordPayment}
    >
      {() => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input id="payment-amount" label={copy.amount} inputMode="decimal" readOnly value="" />
            <Select disabled id="payment-method" label={copy.method} defaultValue="Bank Transfer">
              {[
                'Cash',
                'Credit Card',
                'Bank Transfer',
                'Check',
                'Online Payment',
                'Wire Transfer',
              ].map((method) => (
                <option key={method} value={method}>
                  {label(method)}
                </option>
              ))}
            </Select>
            <Input id="payment-date" label={copy.paymentDate} type="date" readOnly value="" />
            <Input id="payment-reference" label={copy.reference} readOnly value="" />
          </div>
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {copy.receipt}
            </p>
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-2 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <label htmlFor="payment-receipt" className="text-sm font-medium text-blue-600">
                  {copy.upload}
                </label>
                <input
                  id="payment-receipt"
                  type="file"
                  disabled
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                />
                <p className="text-xs text-gray-500">{copy.attachmentsPending}</p>
              </div>
            </div>
          </div>
          <FinanceNotes />
        </>
      )}
    </FinanceEntryFrame>
  );
}
