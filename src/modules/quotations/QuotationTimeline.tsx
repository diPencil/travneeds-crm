import { useState } from 'react';
import { ChevronDown, ListOrdered } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useQuotationText } from './quotation.labels';

export function QuotationTimeline<Step extends string>({
  steps,
  current,
  locked,
  onSelect,
}: {
  steps: readonly Step[];
  current: Step;
  locked: boolean;
  onSelect: (step: Step) => void;
}) {
  const { text, label } = useQuotationText();
  const [expanded, setExpanded] = useState(false);
  const index = steps.indexOf(current);
  const title = text('Quotation builder steps', 'خطوات إنشاء الكوتيشن');
  const position = text(
    `Step ${index + 1} of ${steps.length}`,
    `الخطوة ${index + 1} من ${steps.length}`,
  );
  return (
    <nav
      aria-label={title}
      className="h-fit min-w-0 rounded-2xl xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-gray-900"
    >
      <div className="hidden items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-gray-800 xl:flex">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-600/20 dark:text-blue-200">
          <ListOrdered size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {position}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="quotation-builder-timeline"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 xl:hidden"
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 font-bold text-white"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            {position}
          </span>
          <span className="block text-sm font-bold">{label(current)}</span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={cn('shrink-0 text-slate-500', expanded && 'rotate-180')}
        />
      </button>
      <ol
        id="quotation-builder-timeline"
        className={cn('space-y-0.5 px-2 pb-2 pt-2 xl:block', !expanded && 'hidden')}
      >
        {steps.map((step, stepIndex) => {
          const active = step === current;
          const passed = stepIndex < index;
          return (
            <li key={step} className="relative">
              {stepIndex < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute start-5 top-1/2 z-10 h-[calc(100%+2px)] w-px',
                    passed ? 'bg-blue-300 dark:bg-blue-600/60' : 'bg-slate-200 dark:bg-slate-700',
                  )}
                />
              )}
              <button
                type="button"
                data-step={step}
                aria-current={active ? 'step' : undefined}
                disabled={locked}
                onClick={() => {
                  setExpanded(false);
                  onSelect(step);
                }}
                className={cn(
                  'group relative flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 py-1 text-start text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
                  active
                    ? 'bg-blue-50 font-bold text-blue-800 ring-1 ring-inset ring-blue-100 dark:bg-blue-600/[0.15] dark:text-blue-200 dark:ring-blue-500/30'
                    : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-20 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold tabular-nums',
                    active
                      ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-100 dark:ring-blue-500/40'
                      : passed
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-slate-800 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
                  )}
                >
                  {stepIndex + 1}
                </span>
                <span>{label(step)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
