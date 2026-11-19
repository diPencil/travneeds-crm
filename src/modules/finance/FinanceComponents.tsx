import type { ReactNode } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FinanceSource } from '../../../shared/finance/finance.contracts';
import { Button } from '../../components/ui/Button';
import { useFinanceCopy } from './finance.copy';

export function FinanceHeading({
  title,
  description,
  actions,
  back = false,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  const { isRTL, copy } = useFinanceCopy();
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2563EB] text-white p-8 rounded-3xl shadow-lg shadow-blue-500/20 mb-8">
      <div className="flex items-center gap-4">
        {back && (
          <Button
            variant="outline"
            className="p-2 bg-white/10 text-white border-transparent hover:bg-white/20"
            aria-label={copy.back}
            onClick={() => navigate('/finance')}
          >
            <ArrowLeft size={20} className={isRTL ? 'rotate-180' : ''} />
          </Button>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-blue-100 opacity-90">{description}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 banner-actions">{actions}</div>}
    </div>
  );
}
export function FinanceAvailability({
  source,
  currency,
}: {
  source?: FinanceSource;
  currency?: string;
}) {
  const { copy } = useFinanceCopy();
  if (!source) return null;
  return (
    <div className="mb-6 text-sm text-slate-600 dark:text-slate-300">
      {source.status === 'pending_trips' && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 p-4 mb-3"
        >
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p>{copy.pending}</p>
        </div>
      )}
      {currency && (
        <p className="text-xs text-gray-500">
          {copy.currency}: <bdi>{currency}</bdi>
        </p>
      )}
    </div>
  );
}
export function FinancePagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: string) => void;
}) {
  const { copy } = useFinanceCopy();
  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <Button variant="outline" disabled={page <= 1} onClick={() => onPage(String(page - 1))}>
        {copy.previous}
      </Button>
      <p className="text-sm text-gray-500">
        {page} / {Math.max(1, Math.ceil(total / pageSize))} · {total} {copy.entries}
      </p>
      <Button
        variant="outline"
        disabled={page * pageSize >= total}
        onClick={() => onPage(String(page + 1))}
      >
        {copy.next}
      </Button>
    </div>
  );
}
