import { useState } from 'react';
import { Languages } from 'lucide-react';
import type { QuotationContent } from '../../../shared/quotations/quotation.contracts';
import { useAuth } from '../auth/useAuth';
import { apiRequest, ApiError } from '../../lib/http/api';
import { AccountDialog } from '../../components/ui/AccountDialog';
import { Button } from '../../components/ui/Button';
import { useToastContext } from '../../hooks/useToastContext';
import { useQuotationText } from './quotation.labels';

interface TranslationField {
  path: string[];
  source: string;
  target: string;
  rich: boolean;
}
function fieldsForSection(
  content: QuotationContent,
  section: string,
  language: 'en' | 'ar',
): TranslationField[] {
  const source = language === 'en' ? 'ar' : 'en';
  const result: TranslationField[] = [];
  const keys: Record<string, (keyof QuotationContent)[]> = {
    basic: [
      'title',
      'summary',
      'location',
      'destination',
      'duration',
      'groupSize',
      'travelStyle',
      'departurePort',
    ],
    addons: ['addOns'],
    overview: ['overview'],
    highlights: ['highlights'],
    itinerary: ['itinerary', 'itineraryNote'],
    hotels: ['hotels'],
    inclusions: ['included', 'excluded', 'terms'],
    dates: ['datePrices'],
    media: ['gallery', 'videos'],
    map: ['locations'],
  };
  function visit(value: unknown, path: string[]) {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (typeof object.en === 'string' && typeof object.ar === 'string') {
      const localized = { en: object.en, ar: object.ar };
      if (localized[source].trim() && !localized[language].trim())
        result.push({
          path,
          source: localized[source],
          target: localized[language],
          rich:
            path[0] === 'overview' ||
            path[0] === 'itineraryNote' ||
            (path.length === 3 &&
              path[2] === 'description' &&
              (path[0] === 'hotels' || path[0] === 'itinerary')),
        });
      return;
    }
    for (const [key, item] of Object.entries(object)) visit(item, [...path, key]);
  }
  for (const key of keys[section] ?? []) visit(content[key], [key]);
  return result;
}
function applyTranslations(
  content: QuotationContent,
  fields: TranslationField[],
  language: 'en' | 'ar',
): QuotationContent {
  const result = structuredClone(content);
  for (const field of fields) {
    let current: unknown = result;
    for (const key of field.path) {
      if (!current || typeof current !== 'object') throw new Error('Translation field changed');
      current = Reflect.get(current, key);
    }
    if (!current || typeof current !== 'object') throw new Error('Translation field changed');
    Reflect.set(current, language, field.target);
  }
  return result;
}
export function QuotationTranslation({
  content,
  section,
  language,
  disabled,
  onApply,
  onBusy,
}: {
  content: QuotationContent;
  section: string;
  language: 'en' | 'ar';
  disabled: boolean;
  onApply: (content: QuotationContent) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { text } = useQuotationText();
  const { csrfToken } = useAuth();
  const toast = useToastContext();
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<TranslationField[] | null>(null);
  const fields = fieldsForSection(content, section, language);
  async function translate() {
    if (!csrfToken || disabled || busy || !fields.length) return;
    setBusy(true);
    onBusy(true);
    try {
      const translated = fields.map((field) => ({ ...field }));
      for (const format of ['text', 'html'] as const) {
        const matching = translated.filter((field) => field.rich === (format === 'html'));
        const encoder = new TextEncoder();
        const batches: TranslationField[][] = [];
        let size = 2;
        for (const field of matching) {
          const bytes = encoder.encode(JSON.stringify(field.source)).length + 1;
          if (bytes > 59998) throw new Error('Translation field exceeds provider limits');
          const previous = batches[batches.length - 1];
          if (!previous || size + bytes > 60000 || previous.length === 16) {
            batches.push([field]);
            size = 2 + bytes;
          } else {
            previous.push(field);
            size += bytes;
          }
        }
        for (const batch of batches) {
          const result = await apiRequest<{ translations: string[] }>('/content-translation', {
            method: 'POST',
            csrfToken,
            body: {
              source: language === 'ar' ? 'en' : 'ar',
              target: language,
              format,
              texts: batch.map((field) => field.source),
            },
          });
          batch.forEach((field, index) => {
            field.target = result.translations[index];
          });
        }
      }
      setProposal(translated);
    } catch (failure) {
      toast.error(
        failure instanceof ApiError && failure.code === 'INTEGRATION_NOT_CONFIGURED'
          ? text(
              'Configure and enable Google Cloud Translation in Settings first. Manual bilingual editing remains available.',
              'اضبط وفعّل Google Cloud Translation في Settings أولًا. الكتابة اليدوية باللغتين متاحة.',
            )
          : text(
              'Automatic translation failed. No content was changed. Shorten the section or review provider configuration.',
              'تعذّرت الترجمة التلقائية. لم يتغير المحتوى. قلّل حجم القسم أو راجع إعدادات المزوّد.',
            ),
      );
      onBusy(false);
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    setProposal(null);
    onBusy(false);
  };
  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || !fields.length}
        loading={busy}
        onClick={() => void translate()}
      >
        <Languages size={16} />
        {language === 'ar'
          ? text('Translate English → Arabic', 'ترجمة الإنجليزي إلى العربي')
          : text('Translate Arabic → English', 'ترجمة العربي إلى الإنجليزي')}
      </Button>
      {proposal && (
        <AccountDialog
          title={text('Review Translation', 'مراجعة الترجمة')}
          icon={Languages}
          onClose={close}
          className="max-w-4xl"
        >
          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {proposal.map((field, index) => (
              <div key={field.path.join('.')} className="grid md:grid-cols-2 gap-4">
                <div
                  className="text-sm whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-gray-900 p-3"
                  dir={language === 'ar' ? 'ltr' : 'rtl'}
                >
                  {field.source}
                </div>
                <div>
                  <label htmlFor={`translation-${index}`} className="text-sm font-semibold">
                    {text('Translation', 'الترجمة')} {index + 1}
                  </label>
                  <textarea
                    id={`translation-${index}`}
                    rows={4}
                    value={field.target}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    className="w-full rounded-xl bg-slate-50 dark:bg-gray-900 p-3 mt-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={(event) =>
                      setProposal(
                        (previous) =>
                          previous?.map((item, i) =>
                            i === index ? { ...item, target: event.target.value } : item,
                          ) ?? null,
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={close}>
              {text('Cancel', 'إلغاء')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply(applyTranslations(content, proposal, language));
                close();
              }}
            >
              {text('Apply reviewed translation', 'تطبيق الترجمة بعد المراجعة')}
            </Button>
          </div>
        </AccountDialog>
      )}
    </>
  );
}
