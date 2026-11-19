import { emptyLocalized } from '../../../shared/quotations/quotation.contracts';
import type {
  PassengerRate,
  QuotationContent,
} from '../../../shared/quotations/quotation.contracts';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { QuotationRows, QuotationRow, QuotationLocalizedField } from './QuotationFields';
import type { QuotationTabProps } from './quotation-editor.types';
import { useQuotationText } from './quotation.labels';

export function QuotationPricingTab({ content, setContent, options, language }: QuotationTabProps) {
  const { text } = useQuotationText();
  const pricing = content.pricing;
  const update = <K extends keyof QuotationContent['pricing']>(
    key: K,
    value: QuotationContent['pricing'][K],
  ) => setContent((previous) => ({ ...previous, pricing: { ...previous.pricing, [key]: value } }));
  const rows = (key: 'adultRates' | 'childRates' | 'infantRates', title: string) => {
    const change = (index: number, values: Partial<PassengerRate>) =>
      update(
        key,
        pricing[key].map((row, i) => (i === index ? { ...row, ...values } : row)),
      );
    return (
      <section
        key={key}
        className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4"
      >
        <h3 className="font-bold">{title}</h3>
        {pricing[key].map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Input
              id={`${key}-${index}-count`}
              label={text('Total travelers', 'إجمالي المسافرين')}
              type="number"
              min={1}
              max={60}
              value={row.travelers}
              onChange={(event) => change(index, { travelers: Number(event.target.value) })}
            />
            <Input
              id={`${key}-${index}-price`}
              label={text('Per-person price', 'سعر الفرد')}
              inputMode="decimal"
              value={row.price}
              onChange={(event) => change(index, { price: event.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`${text('Remove rate', 'حذف السعر')} ${index + 1}`}
              onClick={() =>
                update(
                  key,
                  pricing[key].filter((_, i) => i !== index),
                )
              }
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={pricing[key].length >= 60}
          onClick={() =>
            update(key, [...pricing[key], { travelers: pricing[key].length + 1, price: '' }])
          }
        >
          {text('Add traveler tier', 'إضافة فئة مسافرين')}
        </Button>
      </section>
    );
  };
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-5">
        <Select
          id="quotation-currency"
          label={text('Currency', 'العملة')}
          value={pricing.currency}
          onChange={(event) => update('currency', event.target.value)}
        >
          {[...new Set([...options.currencies, content.pricing.currency])].map((currency) => (
            <option key={currency}>{currency}</option>
          ))}
        </Select>
        <Input
          id="quotation-base"
          label={text('Base adult price', 'السعر الأساسي للبالغ')}
          inputMode="decimal"
          value={pricing.basePrice}
          onChange={(event) => update('basePrice', event.target.value)}
        />
        {(['adults', 'children', 'infants'] as const).map((key) => (
          <Input
            key={key}
            id={`quotation-${key}`}
            label={
              key === 'adults'
                ? text('Adults', 'البالغون')
                : key === 'children'
                  ? text('Children', 'الأطفال')
                  : text('Infants', 'الرضع')
            }
            type="number"
            min={key === 'adults' ? 1 : 0}
            max={60}
            value={pricing[key]}
            onChange={(event) => update(key, Number(event.target.value))}
          />
        ))}
        <Input
          id="quotation-start"
          label={text('Travel start date', 'تاريخ بداية الرحلة')}
          type="date"
          value={pricing.startDate}
          onChange={(event) => update('startDate', event.target.value)}
        />
        <Input
          id="quotation-end"
          label={text('Travel end date', 'تاريخ نهاية الرحلة')}
          type="date"
          value={pricing.endDate}
          min={pricing.startDate || undefined}
          onChange={(event) => update('endDate', event.target.value)}
        />
        <Input
          id="quotation-discount"
          label={text('Traveler discount (%)', 'خصم المسافرين (%)')}
          inputMode="decimal"
          value={pricing.discountPercent}
          onChange={(event) => update('discountPercent', event.target.value)}
        />
        <Input
          id="quotation-discount-end"
          label={text('Discount ends on', 'تاريخ انتهاء الخصم')}
          type="date"
          value={pricing.discountEndsOn}
          onChange={(event) => update('discountEndsOn', event.target.value)}
        />
      </div>
      <p className="text-sm text-gray-500">
        {text(
          'Traveler tiers use total group size, then the nearest lower tier or first tier. Without a tier: adults use the base price, children use the adult rate, infants default to free. Enter an infant tier to charge infants. Discounts apply to traveler units; selected extras and additional hotels are not discounted.',
          'الفئات حسب حجم المجموعة، ثم أقرب فئة أقل أو أول فئة. بدون فئة: البالغ بالسعر الأساسي، الطفل بسعر البالغ، والرضيع مجانًا. أضف فئة للرضع لو لهم سعر. الخصم على أسعار المسافرين فقط؛ الإضافات والفنادق الإضافية لا يشملها الخصم.',
        )}
      </p>
      <div className="grid xl:grid-cols-3 gap-5">
        {rows('adultRates', text('Adult rates', 'أسعار البالغين'))}
        {rows('childRates', text('Child rates', 'أسعار الأطفال'))}
        {rows('infantRates', text('Infant rates', 'أسعار الرضع'))}
      </div>
      <section className="space-y-5 border-t border-gray-100 dark:border-gray-800 pt-6">
        <h2 className="text-lg font-bold">
          {text(
            'Internal costs — never shown to the customer',
            'التكاليف الداخلية — لا تظهر للعميل',
          )}
        </h2>
        <label className="flex gap-3 text-sm items-start">
          <input
            type="checkbox"
            checked={pricing.costsComplete}
            onChange={(event) => update('costsComplete', event.target.checked)}
          />
          {text(
            'All supplier and operating costs have been entered. Missing room costs still make profit unavailable.',
            'تم إدخال كل تكاليف الموردين والتشغيل. أي تكلفة غرفة ناقصة تظل تجعل الربح غير متاح.',
          )}
        </label>
        <QuotationRows
          title={text('Other cost items', 'بنود التكاليف الأخرى')}
          disabled={pricing.costItems.length >= 60}
          onAdd={() =>
            update('costItems', [
              ...pricing.costItems,
              { id: crypto.randomUUID(), title: emptyLocalized(), supplierId: '', amount: '' },
            ])
          }
        >
          {pricing.costItems.map((item, index) => (
            <QuotationRow
              key={item.id}
              title={`${text('Cost', 'تكلفة')} ${index + 1}`}
              onRemove={() =>
                update(
                  'costItems',
                  pricing.costItems.filter((row) => row.id !== item.id),
                )
              }
            >
              <div className="grid md:grid-cols-3 gap-5">
                <QuotationLocalizedField
                  language={language}
                  label={text('Description', 'الوصف')}
                  value={item.title}
                  onChange={(title) =>
                    update(
                      'costItems',
                      pricing.costItems.map((row) =>
                        row.id === item.id ? { ...row, title } : row,
                      ),
                    )
                  }
                />
                <Select
                  id={`cost-${item.id}-supplier`}
                  label={text('Supplier (optional)', 'المورد (اختياري)')}
                  value={item.supplierId}
                  onChange={(event) =>
                    update(
                      'costItems',
                      pricing.costItems.map((row) =>
                        row.id === item.id ? { ...row, supplierId: event.target.value } : row,
                      ),
                    )
                  }
                >
                  <option value="">{text('Internal expense', 'مصروف داخلي')}</option>
                  {options.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
                <Input
                  id={`cost-${item.id}-amount`}
                  label={text('Amount', 'المبلغ')}
                  value={item.amount}
                  inputMode="decimal"
                  onChange={(event) =>
                    update(
                      'costItems',
                      pricing.costItems.map((row) =>
                        row.id === item.id ? { ...row, amount: event.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
            </QuotationRow>
          ))}
        </QuotationRows>
      </section>
    </div>
  );
}
