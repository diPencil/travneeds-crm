import { Plus, Trash2 } from 'lucide-react';
import type { InvoiceLineInput, InvoiceTotals } from '../../../shared/finance/invoice-calculation';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useInvoiceCopy } from './invoice.copy';
export function InvoiceItemsEditor({
  items,
  onChange,
  totals,
  currency,
}: {
  items: InvoiceLineInput[];
  onChange: (items: InvoiceLineInput[]) => void;
  totals: InvoiceTotals | null;
  currency: string;
}) {
  const { copy, intlLocale } = useInvoiceCopy();
  const update = (index: number, key: keyof InvoiceLineInput, value: string) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  return (
    <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-bold text-lg">{copy.items}</h2>
        <Button
          type="button"
          variant="outline"
          disabled={items.length >= 100}
          onClick={() => onChange([...items, { description: '', quantity: '1', unitPrice: '' }])}
        >
          <Plus size={16} />
          {copy.add}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-start">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
              {['#', copy.description, copy.quantity, copy.unitPrice, copy.amount, ''].map(
                (text, i) => (
                  <th key={i} className="text-start py-3 px-2">
                    {text}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 text-gray-400">{index + 1}</td>
                <td className="p-2 w-[40%]">
                  <Input
                    aria-label={`${copy.description} ${index + 1}`}
                    value={item.description}
                    maxLength={1000}
                    required
                    onChange={(event) => update(index, 'description', event.target.value)}
                  />
                </td>
                <td className="p-2 w-28">
                  <Input
                    aria-label={`${copy.quantity} ${index + 1}`}
                    inputMode="decimal"
                    dir="ltr"
                    value={item.quantity}
                    required
                    onChange={(event) => update(index, 'quantity', event.target.value)}
                  />
                </td>
                <td className="p-2 w-36">
                  <Input
                    aria-label={`${copy.unitPrice} ${index + 1}`}
                    inputMode="decimal"
                    dir="ltr"
                    value={item.unitPrice}
                    required
                    onChange={(event) => update(index, 'unitPrice', event.target.value)}
                  />
                </td>
                <td className="p-2 font-semibold whitespace-nowrap">
                  <bdi>
                    {formatFinanceMoney(totals?.lineAmounts[index] ?? null, currency, intlLocale)}
                  </bdi>
                </td>
                <td className="p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`${copy.remove} ${index + 1}`}
                    disabled={items.length === 1}
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">{copy.rounding}</p>
    </section>
  );
}
