import { CataloguePicker } from '../catalogue/CataloguePicker';
import { emptyLocalized } from '../../../shared/quotations/quotation.contracts';
import {
  QuotationRows,
  QuotationRow,
  QuotationLocalizedField,
  QuotationImageField,
} from './QuotationFields';
import type { QuotationTabProps } from './quotation-editor.types';
import { useQuotationText } from './quotation.labels';

export function QuotationOverviewTab({
  content,
  setContent,
  language,
  disabled,
}: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <QuotationLocalizedField
      label={text('Overview', 'نظرة عامة')}
      value={content.overview}
      language={language}
      rich
      disabled={disabled}
      onChange={(overview) => setContent((previous) => ({ ...previous, overview }))}
    />
  );
}
export function QuotationHighlightsTab({
  content,
  setContent,
  language,
  onUploadState,
}: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <div className="space-y-6">
      <QuotationImageField
        label={text('Highlights image', 'صورة أبرز المعالم')}
        value={content.highlightImage}
        onUploadState={onUploadState}
        onChange={(highlightImage) => setContent((previous) => ({ ...previous, highlightImage }))}
      />
      <QuotationRows
        title={text('Highlight groups', 'مجموعات أبرز المعالم')}
        disabled={content.highlights.length >= 30}
        onAdd={() =>
          setContent((previous) => ({
            ...previous,
            highlights: [
              ...previous.highlights,
              { id: crypto.randomUUID(), title: emptyLocalized(), items: emptyLocalized() },
            ],
          }))
        }
      >
        {content.highlights.map((item, index) => (
          <QuotationRow
            key={item.id}
            title={`${text('Group', 'مجموعة')} ${index + 1}`}
            onRemove={() =>
              setContent((previous) => ({
                ...previous,
                highlights: previous.highlights.filter((row) => row.id !== item.id),
              }))
            }
          >
            <QuotationLocalizedField
              label={text('Group title', 'عنوان المجموعة')}
              value={item.title}
              language={language}
              onChange={(title) =>
                setContent((previous) => ({
                  ...previous,
                  highlights: previous.highlights.map((row) =>
                    row.id === item.id ? { ...row, title } : row,
                  ),
                }))
              }
            />
            <QuotationLocalizedField
              label={text('Highlights (one per line)', 'أبرز المعالم (كل عنصر في سطر)')}
              value={item.items}
              language={language}
              multiline
              maxLength={6000}
              onChange={(items) =>
                setContent((previous) => ({
                  ...previous,
                  highlights: previous.highlights.map((row) =>
                    row.id === item.id ? { ...row, items } : row,
                  ),
                }))
              }
            />
          </QuotationRow>
        ))}
      </QuotationRows>
    </div>
  );
}
export function QuotationItineraryTab({
  content,
  setContent,
  language,
  onUploadState,
  disabled,
  options,
}: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <div className="space-y-6">
      <QuotationRows
        title={text('Itinerary days / stops', 'أيام / محطات البرنامج')}
        disabled={content.itinerary.length >= 60}
        onAdd={() =>
          setContent((previous) => ({
            ...previous,
            itinerary: [
              ...previous.itinerary,
              {
                id: crypto.randomUUID(),
                day: emptyLocalized(),
                title: emptyLocalized(),
                description: emptyLocalized(),
                meals: emptyLocalized(),
                image: '',
              },
            ],
          }))
        }
      >
        {content.itinerary.map((item, index) => {
          const update = (patch: Partial<typeof item>) =>
            setContent((previous) => ({
              ...previous,
              itinerary: previous.itinerary.map((row) =>
                row.id === item.id ? { ...row, ...patch } : row,
              ),
            }));
          return (
            <QuotationRow
              key={item.id}
              title={`${text('Day / Stop', 'يوم / محطة')} ${index + 1}`}
              onRemove={() =>
                setContent((previous) => ({
                  ...previous,
                  itinerary: previous.itinerary.filter((row) => row.id !== item.id),
                }))
              }
            >
              <div className="grid md:grid-cols-2 gap-5">
                <QuotationLocalizedField
                  label={text('Day / stop label', 'اسم اليوم / المحطة')}
                  value={item.day}
                  language={language}
                  onChange={(day) => update({ day })}
                />
                <QuotationLocalizedField
                  label={text('Title', 'العنوان')}
                  value={item.title}
                  language={language}
                  onChange={(title) => update({ title })}
                />
              </div>
              <QuotationLocalizedField
                label={text('Description', 'الوصف')}
                value={item.description}
                language={language}
                rich
                disabled={disabled}
                onChange={(description) => update({ description })}
              />
              <CataloguePicker
                id={`itinerary-meal-${item.id}`}
                label={text('Choose a saved meal', 'اختار وجبة محفوظة')}
                entries={options.catalogue.meals}
                value={item.mealId}
                onSelect={(entry) =>
                  update({ mealId: entry?.id, meals: entry?.name ?? item.meals })
                }
              />
              <QuotationLocalizedField
                label={text('Meals', 'الوجبات')}
                value={item.meals}
                language={language}
                onChange={(meals) => update({ meals })}
              />
              <QuotationImageField
                label={text('Day / stop photo', 'صورة اليوم / المحطة')}
                value={item.image}
                onUploadState={onUploadState}
                onChange={(image) => update({ image })}
              />
            </QuotationRow>
          );
        })}
      </QuotationRows>
      <QuotationLocalizedField
        label={text('Itinerary note', 'ملاحظة البرنامج')}
        value={content.itineraryNote}
        language={language}
        rich
        disabled={disabled}
        onChange={(itineraryNote) => setContent((previous) => ({ ...previous, itineraryNote }))}
      />
    </div>
  );
}
export function QuotationInclusionsTab({ content, setContent, language }: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <QuotationLocalizedField
          label={text('Included (one per line)', 'المشمول (كل عنصر في سطر)')}
          value={content.included}
          language={language}
          multiline
          maxLength={10000}
          onChange={(included) => setContent((previous) => ({ ...previous, included }))}
        />
        <QuotationLocalizedField
          label={text('Excluded (one per line)', 'غير المشمول (كل عنصر في سطر)')}
          value={content.excluded}
          language={language}
          multiline
          maxLength={10000}
          onChange={(excluded) => setContent((previous) => ({ ...previous, excluded }))}
        />
      </div>
      <QuotationLocalizedField
        label={text('Terms and conditions', 'الشروط والأحكام')}
        value={content.terms}
        language={language}
        multiline
        maxLength={10000}
        onChange={(terms) => setContent((previous) => ({ ...previous, terms }))}
      />
    </div>
  );
}
