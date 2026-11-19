import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Eye, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type {
  QuotationContent,
  QuotationDocument,
  QuotationOptions,
} from '../../../shared/quotations/quotation.contracts';
import { blankQuotation } from '../../../shared/quotations/quotation.contracts';
import { quotationSaveInput } from '../../../shared/quotations/quotation.validation';
import { calculateQuotation } from '../../../shared/quotations/quotation-pricing';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useToastContext } from '../../hooks/useToastContext';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataState } from '../../components/ui/DataState';
import { QuotationBasicTab } from './QuotationBasicTab';
import { QuotationPricingTab } from './QuotationPricingTab';
import { QuotationHotelsTab } from './QuotationHotelsTab';
import {
  QuotationOverviewTab,
  QuotationHighlightsTab,
  QuotationItineraryTab,
  QuotationInclusionsTab,
} from './QuotationNarrativeTabs';
import { QuotationAddOnsTab, QuotationDatePricesTab } from './QuotationCommercialTabs';
import { QuotationMediaTab, QuotationMapTab } from './QuotationMediaTabs';
import { QuotationFrame } from './QuotationFrame';
import { QuotationTranslation } from './QuotationTranslation';
import { QuotationTimeline } from './QuotationTimeline';
import { useQuotationText } from './quotation.labels';
import type { QuotationTabProps } from './quotation-editor.types';

const steps = [
  'basic',
  'pricing',
  'addons',
  'overview',
  'highlights',
  'itinerary',
  'hotels',
  'inclusions',
  'dates',
  'media',
  'map',
  'review',
] as const;
type Step = (typeof steps)[number];
const components: Partial<Record<Step, (props: QuotationTabProps) => React.ReactNode>> = {
  pricing: QuotationPricingTab,
  addons: QuotationAddOnsTab,
  overview: QuotationOverviewTab,
  highlights: QuotationHighlightsTab,
  itinerary: QuotationItineraryTab,
  hotels: QuotationHotelsTab,
  inclusions: QuotationInclusionsTab,
  dates: QuotationDatePricesTab,
  media: QuotationMediaTab,
  map: QuotationMapTab,
};

export function QuotationEditorPage() {
  const { id } = useParams();
  const options = useApiResource<QuotationOptions>('/quotations/options');
  const resource = useApiResource<QuotationDocument>(id ? `/quotations/${id}` : null);
  if (options.loading || resource.loading || options.error || resource.error)
    return (
      <>
        <DataState {...options} retry={options.reload} />
        <DataState {...resource} retry={resource.reload} />
      </>
    );
  if (!options.data) return null;
  return (
    <QuotationEditor
      key={id ?? 'new'}
      options={options.data}
      initial={resource.data ?? undefined}
    />
  );
}
function QuotationEditor({
  options,
  initial,
}: {
  options: QuotationOptions;
  initial?: QuotationDocument;
}) {
  const { text, label, isRTL } = useQuotationText();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const { csrfToken } = useAuth();
  const toast = useToastContext();
  const translation = useApiResource<{ available: boolean }>('/content-translation/status');
  const [content, updateContent] = useState<QuotationContent>(
    initial?.content ?? blankQuotation(options.baseCurrency),
  );
  const [customerId, setCustomerId] = useState(
    initial?.customerId ?? query.get('customerId') ?? '',
  );
  const [saved, setSaved] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<Step>('basic');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusStep = useRef(false);
  const stepIndex = steps.indexOf(step);
  useEffect(() => {
    if (!focusStep.current || !stepHeading.current) return;
    focusStep.current = false;
    stepHeading.current.focus({ preventScroll: true });
    stepHeading.current.scrollIntoView({ block: 'nearest' });
  }, [step, preview]);
  function goToStep(next: Step) {
    if (next !== step || preview) focusStep.current = true;
    setStep(next);
    setPreview(null);
  }
  const setContent: Dispatch<SetStateAction<QuotationContent>> = (value) => {
    updateContent(value);
    setDirty(true);
    setPreview(null);
  };
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const locked = busy || uploads > 0 || translating;
  const props: QuotationTabProps = {
    content,
    setContent,
    options,
    language,
    disabled: locked,
    onUploadState: (active) => setUploads((previous) => previous + (active ? 1 : -1)),
  };
  let price: ReturnType<typeof calculateQuotation> | null = null;
  try {
    price = calculateQuotation(content);
  } catch {
    /* A draft with incomplete prices has no fabricated total. */
  }
  async function save(ready = false) {
    if (!csrfToken || locked) return;
    setFeedback('');
    const payload = {
      content,
      customerId,
      version: saved?.version ?? 0,
      requestKey: requestKey.current,
    };
    if (!quotationSaveInput.safeParse(payload).success) {
      setFeedback(
        text(
          'Review the fields: names/text limits, valid dates, image selections, child ages and numeric values.',
          'راجع حدود النصوص، التواريخ، الصور المختارة، أعمار الأطفال والقيم الرقمية.',
        ),
      );
      return;
    }
    setBusy(true);
    let result: QuotationDocument | undefined;
    try {
      result = await apiRequest<QuotationDocument>(
        saved ? `/quotations/${saved.id}` : '/quotations',
        { method: saved ? 'PATCH' : 'POST', csrfToken, body: payload },
      );
      setSaved(result);
      updateContent(result.content);
      setDirty(false);
      requestKey.current = crypto.randomUUID();
      if (ready) {
        result = await apiRequest<QuotationDocument>(`/quotations/${result.id}/status`, {
          method: 'POST',
          csrfToken,
          body: { version: result.version, status: 'ready', requestKey: crypto.randomUUID() },
        });
        setSaved(result);
      }
      toast.success(
        ready
          ? text('Quotation is ready.', 'الكوتيشن جاهز.')
          : text('Draft saved.', 'تم حفظ المسودة.'),
      );
      if (!initial) navigate(`/quotations/${result.id}/edit`, { replace: true });
    } catch (error) {
      if (result && ready) {
        toast.warning(
          text('Draft saved. Quotation is not ready.', 'تم حفظ المسودة. العرض لم يجهز بعد.'),
        );
      }
      setFeedback(
        error instanceof ApiError && error.code === 'RECORD_CHANGED'
          ? text(
              'This quotation changed in another session. Reload before saving.',
              'الكوتيشن اتغير من جلسة أخرى. أعد تحميله قبل الحفظ.',
            )
          : result && ready
            ? text(
                'Draft saved. To mark it ready, complete the customer, title, travel date, validity, pricing and hotel/room details.',
                'المسودة اتحفظت. لتجهيز العرض أكمل العميل والعنوان وتاريخ الرحلة والصلاحية والتسعير والفنادق والغرف.',
              )
            : text(
                'Could not save. Your entries are still here. Review the values and retry.',
                'تعذّر الحفظ. بياناتك ما زالت موجودة. راجع القيم وحاول مرة أخرى.',
              ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function showPreview() {
    if (!csrfToken || locked) return;
    setBusy(true);
    setFeedback('');
    try {
      const result = await apiRequest<{ html: string }>('/quotations/preview', {
        method: 'POST',
        csrfToken,
        body: { content, locale: language },
      });
      setPreview(result.html);
    } catch {
      setFeedback(
        text(
          'Could not prepare the preview. Check your content and dates.',
          'تعذّر تجهيز المعاينة. راجع المحتوى والتواريخ.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const Active = components[step];
  return (
    <div className="w-full pb-8 space-y-6">
      <PageHeader
        title={
          saved
            ? `${text('Quotation', 'كوتيشن')} · ${saved.reference}`
            : text('New Quotation', 'كوتيشن جديد')
        }
        description={text(
          'Build a complete customer proposal from the original trip workflow.',
          'ابنِ عرضًا كاملًا للعميل من مسار إنشاء الرحلة الأصلي.',
        )}
        actions={
          <>
            <Button
              type="button"
              className="bg-white/10 text-white hover:bg-white/20"
              disabled={locked}
              onClick={() => void showPreview()}
            >
              <Eye size={16} />
              {text('Preview', 'معاينة')}
            </Button>
            <Button
              type="button"
              className="bg-white text-blue-600 hover:bg-gray-50"
              disabled={locked}
              onClick={() => void save()}
            >
              <Save size={16} />
              {text('Save Draft', 'حفظ المسودة')}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap justify-between items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (
              !dirty ||
              window.confirm(
                text('Leave without saving these changes?', 'الخروج بدون حفظ التغييرات؟'),
              )
            )
              navigate('/quotations');
          }}
        >
          <ArrowLeft size={16} className={isRTL ? 'rotate-180' : ''} />
          {text('All Quotations', 'كل الكوتيشنات')}
        </Button>
        <div
          role="group"
          aria-label={text('Content language', 'لغة المحتوى')}
          className="flex flex-wrap gap-2 items-center"
        >
          <span className="text-xs text-gray-500">{text('Content language', 'لغة المحتوى')}</span>
          {(['en', 'ar'] as const).map((locale) => (
            <Button
              key={locale}
              type="button"
              variant={language === locale ? 'primary' : 'outline'}
              aria-pressed={language === locale}
              disabled={locked}
              onClick={() => {
                setLanguage(locale);
                setPreview(null);
              }}
            >
              {locale === 'en' ? 'English' : 'العربية'}
            </Button>
          ))}
          {translation.data?.available && !translation.error && !preview && (
            <QuotationTranslation
              content={content}
              section={step}
              language={language}
              disabled={locked}
              onApply={setContent}
              onBusy={setTranslating}
            />
          )}
        </div>
      </div>
      {feedback && (
        <p role="status" className="rounded-xl p-4 bg-blue-50 dark:bg-blue-900/20 text-sm">
          {feedback}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)]">
        <QuotationTimeline steps={steps} current={step} locked={locked} onSelect={goToStep} />
        <div className="min-w-0 space-y-6">
          {preview ? (
            <QuotationFrame html={preview} title={text('Quotation preview', 'معاينة الكوتيشن')} />
          ) : (
            <>
              <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 space-y-6">
                <h2
                  ref={stepHeading}
                  tabIndex={-1}
                  className="scroll-mt-28 text-xl font-bold outline-none"
                >
                  {label(step)}
                </h2>
                <fieldset disabled={locked} className="space-y-6">
                  {step === 'basic' ? (
                    <QuotationBasicTab
                      {...props}
                      customerId={customerId}
                      onCustomer={(id) => {
                        setCustomerId(id);
                        setDirty(true);
                      }}
                    />
                  ) : Active ? (
                    <Active {...props} />
                  ) : (
                    <div className="space-y-6">
                      <dl className="grid sm:grid-cols-2 gap-4">
                        {[
                          [
                            text('Title', 'العنوان'),
                            content.title[language] ||
                              content.title[language === 'en' ? 'ar' : 'en'] ||
                              '—',
                          ],
                          [
                            text('Customer', 'العميل'),
                            options.customers.find((item) => item.id === customerId)?.name ?? '—',
                          ],
                          [text('Trip type', 'نوع الرحلة'), label(content.type)],
                          [text('Hotel stays', 'الإقامات الفندقية'), String(content.hotels.length)],
                          [
                            text('Itinerary items', 'بنود البرنامج'),
                            String(content.itinerary.length),
                          ],
                          [
                            text('Quotation total', 'إجمالي الكوتيشن'),
                            formatFinanceMoney(
                              price?.total ?? null,
                              content.pricing.currency,
                              isRTL ? 'ar-EG' : 'en-US',
                            ),
                          ],
                        ].map(([name, value]) => (
                          <div key={name} className="rounded-xl bg-slate-50 dark:bg-gray-800 p-4">
                            <dt className="text-xs text-gray-500 mb-1">{name}</dt>
                            <dd className="font-bold">
                              <bdi>{value}</bdi>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <label className="block space-y-2">
                        <span className="font-medium text-sm">
                          {text('Internal notes — private', 'ملاحظات داخلية — خاصة')}
                        </span>
                        <textarea
                          rows={5}
                          className="w-full rounded-xl bg-slate-50 dark:bg-gray-800 p-4"
                          value={content.internalNotes}
                          maxLength={20000}
                          onChange={(event) =>
                            setContent((previous) => ({
                              ...previous,
                              internalNotes: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <p className="text-sm text-gray-500">
                        {text(
                          'Ready requires a real customer, a title, a travel date, validity and complete commercial pricing. Internal costs and notes never appear in the customer PDF or link.',
                          'العرض الجاهز يتطلب عميلًا فعليًا وعنوانًا وتاريخ رحلة وصلاحية وتسعيرًا مكتملًا. التكاليف والملاحظات الداخلية لا تظهر في PDF أو رابط العميل.',
                        )}
                      </p>
                      <Button type="button" onClick={() => void save(true)}>
                        <CheckCircle2 size={16} />
                        {text('Save & Mark Ready', 'حفظ وتجهيز العرض')}
                      </Button>
                    </div>
                  )}
                </fieldset>
              </section>
            </>
          )}
          <div className="flex flex-wrap justify-between gap-3 items-center">
            <p className="font-bold">
              <bdi>
                {formatFinanceMoney(
                  price?.total ?? null,
                  content.pricing.currency,
                  isRTL ? 'ar-EG' : 'en-US',
                )}
              </bdi>
              {dirty && (
                <span className="text-xs font-normal text-gray-500 ms-3">
                  {text('Unsaved changes', 'تغييرات غير محفوظة')}
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={locked || stepIndex === 0}
                onClick={() => goToStep(steps[stepIndex - 1])}
              >
                {text('Back', 'السابق')}
              </Button>
              <Button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (step === 'review') void save(true);
                  else goToStep(steps[stepIndex + 1]);
                }}
              >
                {step === 'review'
                  ? text('Save & Mark Ready', 'حفظ وتجهيز العرض')
                  : text('Continue', 'متابعة')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
