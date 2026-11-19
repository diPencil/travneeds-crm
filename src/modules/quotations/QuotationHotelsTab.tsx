import { useState } from 'react';
import { Star } from 'lucide-react';
import { CataloguePicker } from '../catalogue/CataloguePicker';
import { apiRequest } from '../../lib/http/api';
import { appendCatalogueNames, hotelQuotationDefaults } from './hotel-catalogue';
import type { CatalogueEntry, CatalogueHotel } from '../../../shared/catalogue/catalogue.contracts';
import { emptyLocalized } from '../../../shared/quotations/quotation.contracts';
import type { QuotationHotel, QuotationRoom } from '../../../shared/quotations/quotation.contracts';
import { hotelNights } from '../../../shared/quotations/quotation-pricing';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  QuotationRows,
  QuotationRow,
  QuotationLocalizedField,
  QuotationImageField,
} from './QuotationFields';
import type { QuotationTabProps } from './quotation-editor.types';
import { useQuotationText } from './quotation.labels';

export function QuotationHotelsTab({
  content,
  setContent,
  language,
  options,
  onUploadState,
  disabled,
}: QuotationTabProps) {
  const { text } = useQuotationText();
  const update = (id: string, patch: Partial<QuotationHotel>) =>
    setContent((previous) => ({
      ...previous,
      hotels: previous.hotels.map((stay) => (stay.id === id ? { ...stay, ...patch } : stay)),
    }));
  const room = (stayId: string, id: string, patch: Partial<QuotationRoom>) =>
    setContent((previous) => ({
      ...previous,
      hotels: previous.hotels.map((stay) =>
        stay.id === stayId
          ? {
              ...stay,
              rooms: stay.rooms.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            }
          : stay,
      ),
    }));
  const [catalogueError, setCatalogueError] = useState('');
  async function loadHotel(stay: QuotationHotel, entry: CatalogueEntry | undefined) {
    if (!entry) {
      update(stay.id, {
        catalogueId: undefined,
        rooms: stay.rooms.map((item) => ({ ...item, catalogueId: undefined })),
      });
      return;
    }
    if (stay.catalogueId === entry.id) return;
    if (
      (stay.name.en || stay.name.ar || stay.rooms.length) &&
      !window.confirm(
        text(
          'Replace the details of this stay with the selected hotel?',
          'استبدل تفاصيل الإقامة ببيانات الفندق المختار؟',
        ),
      )
    )
      return;
    onUploadState(true);
    setCatalogueError('');
    try {
      const bundle = await apiRequest<CatalogueHotel>(`/catalogue/hotels/${entry.id}/bundle`);
      setContent((previous) => ({
        ...previous,
        hotels: previous.hotels.map((current) =>
          current.id === stay.id
            ? {
                ...current,
                ...hotelQuotationDefaults(bundle, options.catalogue, previous.pricing.currency),
              }
            : current,
        ),
        addOns: [
          ...previous.addOns,
          ...bundle.options
            .filter(
              (item) =>
                item.kind === 'travel-add-ons' &&
                !previous.addOns.some((row) => row.catalogueId === item.id),
            )
            .map((item) => ({
              id: crypto.randomUUID(),
              catalogueId: item.id,
              title: item.name,
              price:
                item.details.currency === previous.pricing.currency
                  ? (item.details.price ?? '')
                  : '',
            })),
        ].slice(0, 50),
      }));
    } catch {
      setCatalogueError(
        text(
          'Could not load hotel details. Try again.',
          'تعذّر تحميل تفاصيل الفندق. حاول مرة تانية.',
        ),
      );
    } finally {
      onUploadState(false);
    }
  }
  const addStay = () =>
    setContent((previous) => ({
      ...previous,
      hotels: [
        ...previous.hotels,
        {
          id: crypto.randomUUID(),
          name: emptyLocalized(),
          description: emptyLocalized(),
          location: emptyLocalized(),
          rating: '',
          supplierId: '',
          contact: '',
          amenities: emptyLocalized(),
          images: [],
          checkIn: '',
          checkOut: '',
          includedInPackage: true,
          rooms: [],
        },
      ],
    }));
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        {text(
          'Add one stay per hotel/date range. Room prices are per room per night. Included stays are displayed but never added to the package total twice. Availability is confirmed externally; saving this quotation does not reserve rooms.',
          'أضف إقامة لكل فندق وفترة. السعر للغرفة في الليلة. الإقامة المشمولة تظهر ولا تُحتسب مرتين. توافر الغرف يُؤكّد خارجيًا؛ حفظ الكوتيشن لا يحجز غرفًا.',
        )}
      </p>
      {catalogueError && (
        <p role="alert" className="text-red-600">
          {catalogueError}
        </p>
      )}
      <QuotationRows
        title={text('Hotel stays', 'الإقامات الفندقية')}
        onAdd={addStay}
        disabled={content.hotels.length >= 30}
        addLabel={text('Add hotel stay', 'إضافة إقامة فندقية')}
      >
        {content.hotels.map((stay, index) => {
          let nights: number | null = null;
          try {
            nights = hotelNights(stay.checkIn, stay.checkOut);
          } catch {
            /* Dates can be incomplete in the editor. */
          }
          return (
            <QuotationRow
              key={stay.id}
              title={`${text('Hotel', 'فندق')} ${index + 1}`}
              onRemove={() =>
                setContent((previous) => ({
                  ...previous,
                  hotels: previous.hotels.filter((item) => item.id !== stay.id),
                }))
              }
            >
              <CataloguePicker
                id={`saved-hotel-${stay.id}`}
                label={text('Choose a saved hotel', 'اختار فندق محفوظ')}
                entries={options.catalogue.hotels}
                value={stay.catalogueId}
                emptyText={text('Enter a new hotel manually', 'أدخل فندق جديد يدويًا')}
                disabled={disabled}
                onSelect={(entry) => void loadHotel(stay, entry)}
              />
              <div className="grid md:grid-cols-2 gap-5">
                <QuotationLocalizedField
                  label={text('Hotel name', 'اسم الفندق')}
                  value={stay.name}
                  language={language}
                  onChange={(name) => update(stay.id, { name })}
                />
                <QuotationLocalizedField
                  label={text('Location / address', 'الموقع / العنوان')}
                  value={stay.location}
                  language={language}
                  onChange={(location) => update(stay.id, { location })}
                />
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    {text('Hotel star category (if known)', 'فئة نجوم الفندق (إن كانت معروفة)')}
                  </legend>
                  <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-50 p-2 dark:bg-gray-800">
                    {(['1', '2', '3', '4', '5'] as const).map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        aria-label={text(`${rating} stars`, `${rating} نجوم`)}
                        aria-pressed={stay.rating === rating}
                        onClick={() => update(stay.id, { rating })}
                        className="rounded-lg p-2 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-700"
                      >
                        <Star
                          size={20}
                          fill={Number(stay.rating) >= Number(rating) ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                    {stay.rating && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => update(stay.id, { rating: '' })}
                      >
                        {text('Clear', 'مسح')}
                      </Button>
                    )}
                  </div>
                </fieldset>
                <Select
                  id={`hotel-${stay.id}-supplier`}
                  label={text('Supplier', 'المورد')}
                  value={stay.supplierId}
                  onChange={(event) => update(stay.id, { supplierId: event.target.value })}
                >
                  <option value="">—</option>
                  {options.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
                <Input
                  id={`hotel-${stay.id}-in`}
                  label={text('Check-in', 'تاريخ الوصول')}
                  type="date"
                  value={stay.checkIn}
                  onChange={(event) => update(stay.id, { checkIn: event.target.value })}
                />
                <Input
                  id={`hotel-${stay.id}-out`}
                  label={text('Check-out', 'تاريخ المغادرة')}
                  type="date"
                  min={stay.checkIn || undefined}
                  value={stay.checkOut}
                  onChange={(event) => update(stay.id, { checkOut: event.target.value })}
                />
                <Input
                  id={`hotel-${stay.id}-contact`}
                  label={text('Internal supplier contact — private', 'تواصل داخلي مع المورد — خاص')}
                  value={stay.contact}
                  maxLength={500}
                  onChange={(event) => update(stay.id, { contact: event.target.value })}
                />
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {(['amenities', 'meals', 'extras'] as const).map((key, index) => {
                  const kind = (['amenities', 'meals', 'travel-add-ons'] as const)[index];
                  const labels = [
                    text('Amenities', 'المرافق والخدمات'),
                    text('Meals', 'الوجبات'),
                    text('Hotel add-ons', 'إضافات الفندق'),
                  ];
                  return (
                    <div key={key} className="space-y-3">
                      <CataloguePicker
                        id={`stay-${stay.id}-${key}`}
                        label={labels[index]}
                        entries={options.catalogue[kind]}
                        onSelect={(entry) => {
                          if (entry)
                            update(stay.id, {
                              [key]: appendCatalogueNames(stay[key] ?? emptyLocalized(), [
                                entry.name,
                              ]),
                            });
                        }}
                      />
                      {key !== 'amenities' && (
                        <QuotationLocalizedField
                          label={text('One item per line', 'عنصر في كل سطر')}
                          value={stay[key] ?? emptyLocalized()}
                          language={language}
                          maxLength={4000}
                          multiline
                          onChange={(value) => update(stay.id, { [key]: value })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm font-semibold">
                {text('Nights', 'الليالي')}: {nights ?? '—'}
              </p>
              <label className="flex gap-3 items-center text-sm">
                <input
                  type="checkbox"
                  checked={stay.includedInPackage}
                  onChange={(event) => update(stay.id, { includedInPackage: event.target.checked })}
                />
                {text('Already included in package price', 'مشمول بالفعل في سعر الباقة')}
              </label>
              <QuotationLocalizedField
                label={text('Hotel description', 'وصف الفندق')}
                value={stay.description}
                language={language}
                rich
                disabled={disabled}
                onChange={(description) => update(stay.id, { description })}
              />
              <QuotationLocalizedField
                label={text('Amenities', 'المرافق والخدمات')}
                value={stay.amenities}
                language={language}
                multiline
                maxLength={4000}
                onChange={(amenities) => update(stay.id, { amenities })}
              />
              <QuotationRows
                title={text('Room selections', 'الغرف المختارة')}
                disabled={stay.rooms.length >= 30}
                addLabel={text('Add room type', 'إضافة نوع غرفة')}
                onAdd={() =>
                  update(stay.id, {
                    rooms: [
                      ...stay.rooms,
                      {
                        id: crypto.randomUUID(),
                        name: emptyLocalized(),
                        board: emptyLocalized(),
                        count: 1,
                        adults: 1,
                        children: 0,
                        infants: 0,
                        childAges: [],
                        sellPerNight: '',
                        costPerNight: '',
                      },
                    ],
                  })
                }
              >
                {stay.rooms.map((item, roomIndex) => (
                  <QuotationRow
                    key={item.id}
                    title={`${text('Room', 'غرفة')} ${roomIndex + 1}`}
                    onRemove={() =>
                      update(stay.id, { rooms: stay.rooms.filter((row) => row.id !== item.id) })
                    }
                  >
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                      <QuotationLocalizedField
                        label={text('Room / category', 'الغرفة / الفئة')}
                        value={item.name}
                        language={language}
                        onChange={(name) => room(stay.id, item.id, { name })}
                      />
                      <CataloguePicker
                        id={`room-meal-${item.id}`}
                        label={text('Saved meal plan', 'خطة وجبات محفوظة')}
                        entries={options.catalogue.meals}
                        value={item.mealId}
                        onSelect={(entry) =>
                          room(stay.id, item.id, {
                            mealId: entry?.id,
                            board: entry?.name ?? item.board,
                          })
                        }
                      />
                      <QuotationLocalizedField
                        label={text('Room description', 'تفاصيل الغرفة')}
                        value={item.description ?? emptyLocalized()}
                        language={language}
                        multiline
                        maxLength={10000}
                        onChange={(description) => room(stay.id, item.id, { description })}
                      />
                      <QuotationLocalizedField
                        label={text('Board / meal plan', 'نظام الإقامة / الوجبات')}
                        value={item.board}
                        language={language}
                        onChange={(board) => room(stay.id, item.id, { board })}
                      />
                      {(['count', 'adults', 'children', 'infants'] as const).map((key) => (
                        <Input
                          key={key}
                          id={`room-${item.id}-${key}`}
                          label={
                            key === 'count'
                              ? text('Number of rooms', 'عدد الغرف')
                              : key === 'adults'
                                ? text('Adults per room', 'البالغون بالغرفة')
                                : key === 'children'
                                  ? text('Children per room', 'الأطفال بالغرفة')
                                  : text('Infants per room', 'الرضع بالغرفة')
                          }
                          type="number"
                          min={key === 'adults' || key === 'count' ? 1 : 0}
                          max={60}
                          value={item[key]}
                          onChange={(event) =>
                            room(stay.id, item.id, { [key]: Number(event.target.value) })
                          }
                        />
                      ))}
                      <Input
                        id={`room-${item.id}-ages`}
                        label={text('Child ages (comma separated)', 'أعمار الأطفال (تفصل بفاصلة)')}
                        defaultValue={item.childAges.join(', ')}
                        onBlur={(event) =>
                          room(stay.id, item.id, {
                            childAges: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean)
                              .map(Number),
                          })
                        }
                      />
                      <Input
                        id={`room-${item.id}-sell`}
                        label={text('Selling price / room / night', 'سعر البيع / غرفة / ليلة')}
                        inputMode="decimal"
                        value={item.sellPerNight}
                        onChange={(event) =>
                          room(stay.id, item.id, { sellPerNight: event.target.value })
                        }
                      />
                      <Input
                        id={`room-${item.id}-cost`}
                        label={text(
                          'Supplier cost / room / night — private',
                          'تكلفة المورد / غرفة / ليلة — خاص',
                        )}
                        inputMode="decimal"
                        value={item.costPerNight}
                        onChange={(event) =>
                          room(stay.id, item.id, { costPerNight: event.target.value })
                        }
                      />
                    </div>
                  </QuotationRow>
                ))}
              </QuotationRows>
              <QuotationRows
                title={text('Hotel photos', 'صور الفندق')}
                disabled={stay.images.length >= 12}
                onAdd={() => update(stay.id, { images: [...stay.images, ''] })}
              >
                {stay.images.map((mediaId, imageIndex) => (
                  <div key={imageIndex} className="rounded-xl bg-slate-50 dark:bg-gray-800 p-4">
                    <QuotationImageField
                      label={`${text('Hotel photo', 'صورة الفندق')} ${imageIndex + 1}`}
                      value={mediaId}
                      onUploadState={onUploadState}
                      onChange={(id) =>
                        update(stay.id, {
                          images: stay.images.map((value, i) => (i === imageIndex ? id : value)),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        update(stay.id, { images: stay.images.filter((_, i) => i !== imageIndex) })
                      }
                    >
                      {text('Remove photo slot', 'حذف خانة الصورة')}
                    </Button>
                  </div>
                ))}
              </QuotationRows>
            </QuotationRow>
          );
        })}
      </QuotationRows>
    </div>
  );
}
