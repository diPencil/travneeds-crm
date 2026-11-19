import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import {
  catalogueKinds,
  catalogueNames,
  catalogueName,
  hotelOptionKinds,
  catalogueSaveInput,
  type CatalogueKind,
  type CatalogueInput,
  type CatalogueEntry,
  type CatalogueHotel,
  type CatalogueDetails,
} from '../../../shared/catalogue/catalogue.contracts';
import {
  emptyLocalized,
  type QuotationOptions,
} from '../../../shared/quotations/quotation.contracts';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { useApiResource } from '../../lib/http/useApiResource';
import { ApiError, apiRequest } from '../../lib/http/api';
import { QuotationImageField, QuotationLocalizedField } from '../quotations/QuotationFields';
import { useQuotationText } from '../quotations/quotation.labels';
import { useAuth } from '../auth/useAuth';
import { useToastContext } from '../../hooks/useToastContext';

export function CataloguePage() {
  const { kind } = useParams();
  const { text } = useQuotationText();
  const matching = catalogueKinds.find((value) => value === kind);
  return matching ? (
    <Directory key={matching} kind={matching} />
  ) : (
    <PageHeader title={text('Catalogue section unavailable', 'قسم الكتالوج غير متاح')} />
  );
}
function Directory({ kind }: { kind: CatalogueKind }) {
  const { text, isRTL } = useQuotationText();
  const language = isRTL ? 'ar' : 'en';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<CatalogueEntry | 'new' | null>(null);
  const options = useApiResource<QuotationOptions>('/quotations/options');
  const list = useApiResource<{ entries: CatalogueEntry[]; hasMore: boolean }>(
    `/catalogue/${kind}?${new URLSearchParams({ search, page: String(page) })}`,
  );
  const bundle = useApiResource<CatalogueHotel>(
    edit && edit !== 'new' && kind === 'hotels' ? `/catalogue/hotels/${edit.id}/bundle` : null,
  );
  function saved() {
    setEdit(null);
    list.reload();
    options.reload();
  }
  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={text(...catalogueNames[kind])}
        actions={
          <Button
            type="button"
            className="bg-white text-blue-700 hover:bg-blue-50"
            onClick={() => setEdit('new')}
          >
            <Plus size={16} />
            {text('Add new', 'إضافة جديد')}
          </Button>
        }
      />
      {edit && (
        <Card>
          <CardContent>
            <DataState {...options} retry={options.reload} />
            {kind === 'hotels' && edit !== 'new' && <DataState {...bundle} retry={bundle.reload} />}
            {options.data &&
              (kind !== 'hotels' || edit === 'new' || bundle.data?.hotel.id === edit.id) && (
                <CatalogueForm
                  key={edit === 'new' ? 'new' : edit.id}
                  kind={kind}
                  entry={edit === 'new' ? undefined : edit}
                  options={options.data}
                  linkedIds={bundle.data?.options.map((option) => option.id) ?? []}
                  onSaved={saved}
                  onCancel={() => setEdit(null)}
                />
              )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-4">
          <Input
            id="catalogue-search"
            label={text('Search', 'بحث')}
            maxLength={160}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>{text('Name', 'الاسم')}</th>
                  <th>{text('Details', 'التفاصيل')}</th>
                  <th>{text('Status', 'الحالة')}</th>
                  <th>{text('Actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-semibold" dir="auto">
                      {catalogueName(entry.name, language)}
                    </td>
                    <td>
                      {kind === 'rooms' ? (
                        catalogueName(
                          options.data?.catalogue.hotels.find((hotel) => hotel.id === entry.hotelId)
                            ?.name ?? emptyLocalized(),
                          language,
                        ) || '—'
                      ) : entry.details.rating ? (
                        <span
                          className="text-amber-600"
                          aria-label={`${entry.details.rating} stars`}
                        >
                          {'★'.repeat(Number(entry.details.rating))}
                        </span>
                      ) : entry.details.price ? (
                        <bdi>
                          {entry.details.price} {entry.details.currency}
                        </bdi>
                      ) : (
                        entry.slug || '—'
                      )}
                    </td>
                    <td>{entry.active ? text('Active', 'نشط') : text('Inactive', 'غير نشط')}</td>
                    <td>
                      <Button type="button" variant="ghost" onClick={() => setEdit(entry)}>
                        <Pencil size={14} />
                        {text('Edit', 'تعديل')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataState {...list} empty={!list.data?.entries.length} retry={list.reload} />
          {list.data && (page > 1 || list.data.hasMore) && (
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                {text('Previous', 'السابق')}
              </Button>
              <bdi>{page}</bdi>
              <Button
                variant="outline"
                disabled={!list.data.hasMore}
                onClick={() => setPage(page + 1)}
              >
                {text('Next', 'التالي')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function CatalogueForm({
  kind,
  entry,
  options,
  linkedIds,
  onSaved,
  onCancel,
}: {
  kind: CatalogueKind;
  entry?: CatalogueEntry;
  options: QuotationOptions;
  linkedIds: string[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { text } = useQuotationText();
  const { csrfToken, user } = useAuth();
  const toast = useToastContext();
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [input, setInput] = useState<CatalogueInput>(
    entry
      ? {
          name: entry.name,
          slug: entry.slug,
          hotelId: entry.hotelId,
          active: entry.active,
          details: entry.details,
          optionIds: linkedIds,
          version: entry.version,
        }
      : {
          name: emptyLocalized(),
          slug: '',
          hotelId: null,
          active: true,
          details: {},
          optionIds: [],
          version: 0,
        },
  );
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  const details = <K extends keyof CatalogueDetails>(key: K, value: CatalogueDetails[K]) =>
    setInput((previous) => ({ ...previous, details: { ...previous.details, [key]: value } }));
  const hotel = kind === 'hotels';
  const room = kind === 'rooms';
  const category = kind === 'multi-day-categories';
  const destination = kind === 'destinations';
  const priced = room || kind === 'travel-add-ons';
  const locked = busy || uploads > 0;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (locked || !csrfToken) return;
    const details = { ...input.details, images: input.details.images?.filter(Boolean) };
    const data = catalogueSaveInput.safeParse({ ...input, details });
    if (!data.success || (room && !input.hotelId)) {
      setError(
        text('Enter a name and check the required fields.', 'أدخل الاسم وراجع الحقول المطلوبة.'),
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/catalogue/${kind}${entry ? `/${entry.id}` : ''}`, {
        method: entry ? 'PATCH' : 'POST',
        body: data.data,
        csrfToken,
      });
      toast.success(text('Catalogue entry saved.', 'تم حفظ سجل الكتالوج.'));
      onSaved();
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.code === 'CATALOGUE_DUPLICATE'
          ? text('An entry with this name or slug already exists.', 'الاسم أو المعرّف موجود بالفعل.')
          : failure instanceof ApiError && failure.status === 409
            ? text(
                'This record changed. Close the form and reopen it.',
                'السجل اتغير. اقفل النموذج وافتحه من جديد.',
              )
            : text(
                'Could not save this entry. Review the fields and try again.',
                'تعذّر الحفظ. راجع الحقول وحاول مرة تانية.',
              ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void save(event)} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {entry ? text('Edit entry', 'تعديل السجل') : text('New entry', 'سجل جديد')}
        </h2>
        <div
          role="group"
          aria-label={text('Content language', 'لغة المحتوى')}
          className="flex gap-2"
        >
          {(['en', 'ar'] as const).map((locale) => (
            <Button
              key={locale}
              type="button"
              size="sm"
              variant={language === locale ? 'primary' : 'outline'}
              aria-pressed={language === locale}
              onClick={() => setLanguage(locale)}
            >
              {locale === 'en' ? 'English' : 'العربية'}
            </Button>
          ))}
        </div>
      </div>
      <fieldset disabled={locked} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <QuotationLocalizedField
            label={text('Name', 'الاسم')}
            value={input.name}
            maxLength={
              category ? 100 : kind === 'travel-add-ons' || kind === 'amenities' ? 200 : 160
            }
            language={language}
            onChange={(name) => setInput({ ...input, name })}
          />
          {room && (
            <Select
              id="catalogue-hotel"
              label={text('Hotel', 'الفندق')}
              value={input.hotelId ?? ''}
              required
              disabled={Boolean(entry)}
              onChange={(event) => setInput({ ...input, hotelId: event.target.value || null })}
            >
              <option value="">{text('Choose hotel', 'اختار فندق')}</option>
              {options.catalogue.hotels.map((item) => (
                <option key={item.id} value={item.id}>
                  {catalogueName(item.name, language)}
                </option>
              ))}
            </Select>
          )}
          {hotelOptionKinds.some((optionKind) => optionKind === kind) && (
            <Select
              id="catalogue-link-hotel"
              label={text('Link to hotel (optional)', 'ربط بفندق (اختياري)')}
              value={input.linkHotelId ?? ''}
              onChange={(event) =>
                setInput({ ...input, linkHotelId: event.target.value || undefined })
              }
            >
              <option value="">—</option>
              {options.catalogue.hotels.map((item) => (
                <option key={item.id} value={item.id}>
                  {catalogueName(item.name, language)}
                </option>
              ))}
            </Select>
          )}
          {(category || destination) && (
            <>
              <Input
                id="catalogue-slug"
                label={text('Slug (optional)', 'المعرّف النصي (اختياري)')}
                maxLength={80}
                value={input.slug}
                onChange={(event) => setInput({ ...input, slug: event.target.value })}
              />
              <Input
                id="catalogue-order"
                label={text('Display order', 'ترتيب العرض')}
                type="number"
                min={0}
                max={100000}
                value={input.details.displayOrder ?? ''}
                onChange={(event) =>
                  details(
                    'displayOrder',
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
              />
            </>
          )}
          {destination &&
            (['showInDestinations', 'showInOneDayTours'] as const).map((key, index) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={input.details[key] ?? true}
                  onChange={(event) => details(key, event.target.checked)}
                />
                {index === 0
                  ? text('Show in destination list', 'تظهر في قائمة الوجهات')
                  : text('Show in one-day tours', 'تظهر في رحلات اليوم الواحد')}
              </label>
            ))}
          {hotel && (
            <>
              <Select
                id="catalogue-hotel-stars"
                label={text('Hotel stars', 'نجوم الفندق')}
                value={input.details.rating ?? ''}
                onChange={(event) =>
                  details('rating', event.target.value as CatalogueDetails['rating'])
                }
              >
                <option value="">—</option>
                {['1', '2', '3', '4', '5'].map((rating) => (
                  <option value={rating} key={rating}>
                    {'★'.repeat(Number(rating))}
                  </option>
                ))}
              </Select>
              <Select
                id="catalogue-destination"
                label={text('Destination', 'الوجهة')}
                value={input.details.destinationId ?? ''}
                onChange={(event) => details('destinationId', event.target.value || undefined)}
              >
                <option value="">—</option>
                {options.catalogue.destinations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogueName(item.name, language)}
                  </option>
                ))}
              </Select>
              <Select
                id="catalogue-supplier"
                label={text('Supplier', 'المورد')}
                value={input.details.supplierId ?? ''}
                onChange={(event) => details('supplierId', event.target.value)}
              >
                <option value="">—</option>
                {options.suppliers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Input
                id="catalogue-contact"
                label={text('Supplier contact', 'التواصل مع المورد')}
                maxLength={500}
                value={input.details.contact ?? ''}
                onChange={(event) => details('contact', event.target.value)}
              />
              <QuotationLocalizedField
                label={text('Hotel address', 'عنوان الفندق')}
                language={language}
                value={input.details.location ?? emptyLocalized()}
                maxLength={160}
                onChange={(location) => details('location', location)}
              />
            </>
          )}
          {room && (
            <>
              {(['adults', 'children', 'infants'] as const).map((key, index) => (
                <Input
                  key={key}
                  id={`catalogue-${key}`}
                  label={
                    [
                      text('Adults', 'البالغين'),
                      text('Children', 'الأطفال'),
                      text('Infants', 'الرضع'),
                    ][index]
                  }
                  type="number"
                  min={index === 0 ? 1 : 0}
                  max={60}
                  value={input.details[key] ?? (index === 0 ? 2 : 0)}
                  onChange={(event) => details(key, Number(event.target.value))}
                />
              ))}
              <Select
                id="catalogue-meal"
                label={text('Meal plan', 'خطة الوجبات')}
                value={input.details.mealId ?? ''}
                onChange={(event) => details('mealId', event.target.value || undefined)}
              >
                <option value="">—</option>
                {options.catalogue.meals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogueName(item.name, language)}
                  </option>
                ))}
              </Select>
            </>
          )}
          {priced && (
            <>
              <Select
                id="catalogue-currency"
                label={text('Price currency', 'عملة السعر')}
                value={input.details.currency ?? ''}
                onChange={(event) => details('currency', event.target.value || undefined)}
              >
                <option value="">—</option>
                {[...new Set([...options.currencies, input.details.currency].filter(Boolean))].map(
                  (code) => (
                    <option key={code}>{code}</option>
                  ),
                )}
              </Select>
              <Input
                id="catalogue-price"
                label={
                  room ? text('Selling price per night', 'سعر البيع لليلة') : text('Price', 'السعر')
                }
                inputMode="decimal"
                value={input.details.price ?? ''}
                onChange={(event) => details('price', event.target.value)}
              />
              {room && (
                <Input
                  id="catalogue-cost"
                  label={text('Cost per night', 'تكلفة الليلة')}
                  inputMode="decimal"
                  value={input.details.cost ?? ''}
                  onChange={(event) => details('cost', event.target.value)}
                />
              )}
            </>
          )}
        </div>
        <QuotationLocalizedField
          label={text('Description', 'الوصف')}
          language={language}
          value={input.details.description ?? emptyLocalized()}
          multiline
          maxLength={10000}
          onChange={(description) => details('description', description)}
        />
        {(hotel || category || destination) && (
          <QuotationImageField
            label={text('Cover image', 'صورة الغلاف')}
            value={input.details.images?.[0] ?? ''}
            onUploadState={(active) => setUploads((count) => count + (active ? 1 : -1))}
            onChange={(id) =>
              details('images', [id, ...(input.details.images?.slice(1) ?? [])].filter(Boolean))
            }
          />
        )}
        {hotel && (
          <div className="grid gap-4 md:grid-cols-3">
            {hotelOptionKinds.map((optionKind) => (
              <fieldset
                key={optionKind}
                className="space-y-2 rounded-2xl border p-4 dark:border-slate-700"
              >
                <legend className="px-1 text-sm font-bold">
                  {text(...catalogueNames[optionKind])}
                </legend>
                {!options.catalogue[optionKind].length && (
                  <p className="text-sm text-slate-500">
                    {text('No entries yet.', 'لا توجد سجلات بعد.')}
                  </p>
                )}
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {options.catalogue[optionKind].map((item) => (
                    <label className="flex gap-2 text-sm" key={item.id}>
                      <input
                        type="checkbox"
                        checked={input.optionIds.includes(item.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setInput((previous) => ({
                            ...previous,
                            optionIds: checked
                              ? [...previous.optionIds, item.id]
                              : previous.optionIds.filter((id) => id !== item.id),
                          }));
                        }}
                      />
                      {catalogueName(item.name, language)}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
        {user?.roles.includes('admin') && (
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={input.active}
              onChange={(event) => setInput({ ...input, active: event.target.checked })}
            />
            {text('Active in catalogue', 'نشط في الكتالوج')}
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={busy}>
            {text('Save', 'حفظ')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {text('Cancel', 'إلغاء')}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
