import { CataloguePicker } from '../catalogue/CataloguePicker';
import { emptyLocalized } from '../../../shared/quotations/quotation.contracts';
import type { QuotationContent } from '../../../shared/quotations/quotation.contracts';
import { Input } from '../../components/ui/Input';
import { QuotationRows, QuotationRow, QuotationLocalizedField } from './QuotationFields';
import type { QuotationTabProps } from './quotation-editor.types';
import { useQuotationText } from './quotation.labels';

export function QuotationAddOnsTab({ content, setContent, language, options }: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        {text(
          'An empty price means on request, not free. Select the extras included in this quotation.',
          'ترك السعر فارغًا يعني حسب الطلب، وليس مجانًا. حدّد الإضافات المختارة في هذا الكوتيشن.',
        )}
      </p>
      <CataloguePicker
        id="quote-addon-catalogue"
        label={text('Add saved travel add-on', 'أضف إضافة سفر محفوظة')}
        entries={options.catalogue['travel-add-ons'].filter(
          (entry) => !content.addOns.some((item) => item.catalogueId === entry.id),
        )}
        disabled={content.addOns.length >= 50}
        onSelect={(entry) => {
          if (entry)
            setContent((previous) => ({
              ...previous,
              addOns: [
                ...previous.addOns,
                {
                  id: crypto.randomUUID(),
                  catalogueId: entry.id,
                  title: entry.name,
                  price:
                    entry.details.currency === previous.pricing.currency
                      ? (entry.details.price ?? '')
                      : '',
                },
              ],
            }));
        }}
      />
      <QuotationRows
        title={text('Optional add-ons', 'الإضافات الاختيارية')}
        disabled={content.addOns.length >= 50}
        onAdd={() =>
          setContent((previous) => ({
            ...previous,
            addOns: [
              ...previous.addOns,
              { id: crypto.randomUUID(), title: emptyLocalized(), price: '' },
            ],
          }))
        }
      >
        {content.addOns.map((item, index) => (
          <QuotationRow
            key={item.id}
            title={`${text('Add-on', 'إضافة')} ${index + 1}`}
            onRemove={() =>
              setContent((previous) => ({
                ...previous,
                addOns: previous.addOns.filter((row) => row.id !== item.id),
                pricing: {
                  ...previous.pricing,
                  selectedAddOns: previous.pricing.selectedAddOns.filter((id) => id !== item.id),
                },
              }))
            }
          >
            <div className="grid md:grid-cols-2 gap-5">
              <QuotationLocalizedField
                label={text('Title', 'العنوان')}
                language={language}
                value={item.title}
                maxLength={200}
                onChange={(title) =>
                  setContent((previous) => ({
                    ...previous,
                    addOns: previous.addOns.map((row) =>
                      row.id === item.id ? { ...row, title } : row,
                    ),
                  }))
                }
              />
              <Input
                id={`addon-${item.id}-price`}
                label={text('Price (empty = on request)', 'السعر (فارغ = حسب الطلب)')}
                inputMode="decimal"
                value={item.price}
                onChange={(event) =>
                  setContent((previous) => ({
                    ...previous,
                    addOns: previous.addOns.map((row) =>
                      row.id === item.id ? { ...row, price: event.target.value } : row,
                    ),
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={content.pricing.selectedAddOns.includes(item.id)}
                onChange={(event) =>
                  setContent((previous) => ({
                    ...previous,
                    pricing: {
                      ...previous.pricing,
                      selectedAddOns: event.target.checked
                        ? [...previous.pricing.selectedAddOns, item.id]
                        : previous.pricing.selectedAddOns.filter((id) => id !== item.id),
                    },
                  }))
                }
              />
              {text('Selected for this quotation', 'محدد لهذا الكوتيشن')}
            </label>
          </QuotationRow>
        ))}
      </QuotationRows>
    </div>
  );
}
export function QuotationDatePricesTab({ content, setContent, language }: QuotationTabProps) {
  const { text } = useQuotationText();
  const update = (id: string, patch: Partial<QuotationContent['datePrices'][number]>) =>
    setContent((previous) => ({
      ...previous,
      datePrices: previous.datePrices.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        {text(
          'These period prices are displayed in the quotation. They are separate from the actual traveler and hotel calculation in Booking Pricing.',
          'أسعار الفترات تظهر في العرض، وهي منفصلة عن الحساب الفعلي للمسافرين والفنادق في تسعير الحجز.',
        )}
      </p>
      <QuotationRows
        title={text('Travel periods', 'فترات السفر')}
        disabled={content.datePrices.length >= 30}
        onAdd={() =>
          setContent((previous) => ({
            ...previous,
            datePrices: [
              ...previous.datePrices,
              {
                id: crypto.randomUUID(),
                title: emptyLocalized(),
                startDate: '',
                endDate: '',
                price: '',
                note: emptyLocalized(),
                prefix: emptyLocalized(),
                tiers: [],
              },
            ],
          }))
        }
      >
        {content.datePrices.map((period, index) => (
          <QuotationRow
            key={period.id}
            title={`${text('Travel period', 'فترة سفر')} ${index + 1}`}
            onRemove={() =>
              setContent((previous) => ({
                ...previous,
                datePrices: previous.datePrices.filter((row) => row.id !== period.id),
              }))
            }
          >
            <QuotationLocalizedField
              label={text('Period title', 'عنوان الفترة')}
              value={period.title}
              language={language}
              maxLength={200}
              onChange={(title) => update(period.id, { title })}
            />
            <div className="grid md:grid-cols-2 gap-5">
              <Input
                id={`period-${period.id}-from`}
                type="date"
                label={text('Start date', 'تاريخ البداية')}
                value={period.startDate}
                onChange={(event) => update(period.id, { startDate: event.target.value })}
              />
              <Input
                id={`period-${period.id}-to`}
                type="date"
                min={period.startDate || undefined}
                label={text('End date', 'تاريخ النهاية')}
                value={period.endDate}
                onChange={(event) => update(period.id, { endDate: event.target.value })}
              />
              <Input
                id={`period-${period.id}-price`}
                label={text('Period base price', 'السعر الأساسي للفترة')}
                value={period.price}
                inputMode="decimal"
                onChange={(event) => update(period.id, { price: event.target.value })}
              />
              <QuotationLocalizedField
                label={text('Price prefix', 'بادئة السعر')}
                value={period.prefix}
                language={language}
                maxLength={100}
                onChange={(prefix) => update(period.id, { prefix })}
              />
            </div>
            <QuotationLocalizedField
              label={text('Period note', 'ملاحظة الفترة')}
              value={period.note}
              language={language}
              multiline
              maxLength={2000}
              onChange={(note) => update(period.id, { note })}
            />
            <QuotationRows
              title={text('Prices within this period', 'الأسعار داخل الفترة')}
              disabled={period.tiers.length >= 30}
              onAdd={() =>
                update(period.id, {
                  tiers: [
                    ...period.tiers,
                    {
                      id: crypto.randomUUID(),
                      label: emptyLocalized(),
                      price: '',
                      suffix: emptyLocalized(),
                    },
                  ],
                })
              }
            >
              {period.tiers.map((tier, tierIndex) => {
                const change = (patch: Partial<typeof tier>) =>
                  update(period.id, {
                    tiers: period.tiers.map((row) =>
                      row.id === tier.id ? { ...row, ...patch } : row,
                    ),
                  });
                return (
                  <QuotationRow
                    key={tier.id}
                    title={`${text('Price', 'سعر')} ${tierIndex + 1}`}
                    onRemove={() =>
                      update(period.id, { tiers: period.tiers.filter((row) => row.id !== tier.id) })
                    }
                  >
                    <div className="grid md:grid-cols-3 gap-5">
                      <QuotationLocalizedField
                        label={text(
                          'Label (Solo / 2 PAX / cabin...)',
                          'العنوان (فردي / شخصين / كابينة...)',
                        )}
                        value={tier.label}
                        language={language}
                        maxLength={200}
                        onChange={(label) => change({ label })}
                      />
                      <Input
                        id={`tier-${tier.id}`}
                        label={text('Price', 'السعر')}
                        value={tier.price}
                        inputMode="decimal"
                        onChange={(event) => change({ price: event.target.value })}
                      />
                      <QuotationLocalizedField
                        label={text('Suffix (per person...)', 'لاحقة السعر (للفرد...)')}
                        value={tier.suffix}
                        language={language}
                        maxLength={100}
                        onChange={(suffix) => change({ suffix })}
                      />
                    </div>
                  </QuotationRow>
                );
              })}
            </QuotationRows>
          </QuotationRow>
        ))}
      </QuotationRows>
    </div>
  );
}
