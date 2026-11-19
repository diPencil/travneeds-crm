import { CataloguePicker } from '../catalogue/CataloguePicker';
import type {
  QuotationContent,
  LocalizedContent,
} from '../../../shared/quotations/quotation.contracts';
import { quotationTypes } from '../../../shared/quotations/quotation.contracts';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { QuotationTabProps } from './quotation-editor.types';
import { QuotationLocalizedField } from './QuotationFields';
import { useQuotationText } from './quotation.labels';

export function QuotationBasicTab({
  content,
  setContent,
  language,
  options,
  customerId,
  onCustomer,
}: { customerId: string; onCustomer: (id: string) => void } & QuotationTabProps) {
  const { text, label } = useQuotationText();
  const localized = (
    key:
      | 'title'
      | 'summary'
      | 'location'
      | 'destination'
      | 'duration'
      | 'groupSize'
      | 'travelStyle'
      | 'departurePort',
    title: string,
    multiline = false,
  ) => (
    <QuotationLocalizedField
      key={key}
      label={title}
      value={content[key]}
      language={language}
      multiline={multiline}
      maxLength={key === 'title' ? 200 : key === 'summary' ? 2000 : 160}
      onChange={(value: LocalizedContent) =>
        setContent((previous) => ({ ...previous, [key]: value }))
      }
    />
  );
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Select
          id="quotation-customer"
          label={text('Customer', 'العميل')}
          value={customerId}
          onChange={(event) => onCustomer(event.target.value)}
        >
          <option value="">{text('Unassigned draft', 'مسودة بدون عميل')}</option>
          {options.customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.email ? ` · ${customer.email}` : ''}
            </option>
          ))}
        </Select>
        <Select
          id="quotation-type"
          label={text('Trip type', 'نوع الرحلة')}
          value={content.type}
          onChange={(event) =>
            setContent((previous) => ({
              ...previous,
              type: event.target.value as QuotationContent['type'],
            }))
          }
        >
          {quotationTypes.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </Select>
        {localized('title', text('Quotation title', 'عنوان الكوتيشن'))}
        {localized('location', text('Primary location', 'الموقع الرئيسي'))}
        <CataloguePicker
          id="destination-catalogue"
          label={text('Saved destinations', 'الوجهات المحفوظة')}
          entries={options.catalogue.destinations.filter(
            (entry) =>
              content.type !== 'one-day-tours' || entry.details.showInOneDayTours !== false,
          )}
          value={content.destinationCatalogueId}
          emptyText={text('Enter manually', 'اكتب يدويًا')}
          onSelect={(entry) =>
            setContent((previous) => ({
              ...previous,
              destinationCatalogueId: entry?.id,
              destination: entry?.name ?? previous.destination,
            }))
          }
        />
        {localized('destination', text('Destination', 'الوجهة'))}
        {localized('duration', text('Duration', 'المدة'))}
        {localized('groupSize', text('Group size', 'حجم المجموعة'))}
        {localized('travelStyle', text('Travel style', 'نمط الرحلة'))}
        {content.type === 'nile-cruises' && (
          <Select
            id="quotation-cruise"
            label={text('Cruise class', 'فئة الكروز')}
            value={content.cruiseType}
            onChange={(event) =>
              setContent((previous) => ({
                ...previous,
                cruiseType: event.target.value as QuotationContent['cruiseType'],
              }))
            }
          >
            <option value="">—</option>
            {[
              'standard-nile-cruises',
              'deluxe-nile-cruise',
              'superior-nile-cruise',
              'luxury-nile-cruise',
            ].map((type) => (
              <option key={type} value={type}>
                {label(type)}
              </option>
            ))}
          </Select>
        )}
        {(content.type === 'shore-excursions' || content.type === 'nile-cruises') &&
          localized('departurePort', text('Departure port', 'ميناء الانطلاق'))}
        {content.type === 'multi-days-tours' && (
          <CataloguePicker
            id="category-catalogue"
            label={text('Add a Multi Day Category', 'أضف فئة رحلة متعددة الأيام')}
            entries={options.catalogue['multi-day-categories'].filter(
              (entry) => !content.categories.includes(entry.name.en || entry.name.ar),
            )}
            disabled={content.categories.length >= 20}
            onSelect={(entry) => {
              if (entry)
                setContent((previous) => ({
                  ...previous,
                  categories: [...previous.categories, entry.name.en || entry.name.ar],
                  categoryCatalogueRefs: [
                    ...(previous.categoryCatalogueRefs ?? []).filter((ref) =>
                      previous.categories.includes(ref.name),
                    ),
                    { id: entry.id, name: entry.name.en || entry.name.ar },
                  ],
                }));
            }}
          />
        )}
        <Input
          key={content.categories.join('|')}
          id="quotation-categories"
          label={text('Additional categories (comma separated)', 'تصنيفات إضافية (تفصل بفاصلة)')}
          defaultValue={content.categories.join(', ')}
          onBlur={(event) =>
            setContent((previous) => ({
              ...previous,
              categories: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            }))
          }
        />
        <Input
          id="quotation-expiry"
          label={text('Quotation valid until', 'صلاحية الكوتيشن حتى')}
          type="date"
          value={content.validUntil}
          onChange={(event) =>
            setContent((previous) => ({ ...previous, validUntil: event.target.value }))
          }
        />
      </div>
      {localized('summary', text('Short summary', 'نبذة مختصرة'), true)}
      <p className="text-sm text-gray-500">
        {text(
          'Create a customer by converting a lead or using Customers. A draft can remain unassigned; sharing and booking require an actual customer.',
          'يمكن إنشاء عميل بتحويل ليد أو من صفحة العملاء. المسودة ممكن بدون عميل؛ المشاركة والحجز يتطلبان عميلًا فعليًا.',
        )}
      </p>
    </div>
  );
}
