import {
  DollarSign,
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChart,
} from 'lucide-react';
import type { FinanceSummary } from '../../../shared/finance/finance.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { StatCard } from '../../components/ui/StatCard';
import { useFinanceCopy } from './finance.copy';

export function FinanceMetrics({
  summary,
  currency,
}: {
  summary: FinanceSummary | null;
  currency: string;
}) {
  const { copy, intlLocale } = useFinanceCopy();
  const money = (value: string | null | undefined) =>
    formatFinanceMoney(value ?? null, currency, intlLocale);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        label={copy.cashReceived}
        value={money(summary?.cashReceived)}
        icon={DollarSign}
        iconColor="text-emerald-500"
      />
      <StatCard
        label={copy.receivables}
        value={money(summary?.receivables)}
        icon={CreditCard}
        iconColor="text-amber-500"
      />
      <StatCard
        label={copy.supplierPayables}
        value={money(summary?.supplierPayables)}
        icon={Users}
        iconColor="text-rose-500"
      />
      <StatCard
        label={copy.netProfit}
        value={money(summary?.netProfit)}
        icon={TrendingUp}
        iconColor="text-blue-500"
        trend={summary?.profitMargin ? `${summary.profitMargin}% ${copy.margin}` : undefined}
      />
      <StatCard
        label={copy.overdue}
        value={summary?.overdue ?? '—'}
        icon={AlertTriangle}
        iconColor="text-rose-500"
      />
    </div>
  );
}
export function ReportMetrics({
  summary,
  currency,
}: {
  summary: FinanceSummary | null;
  currency: string;
}) {
  const { copy, intlLocale } = useFinanceCopy();
  const money = (value: string | null | undefined) =>
    formatFinanceMoney(value ?? null, currency, intlLocale);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard
        label={copy.revenue}
        value={money(summary?.totalAmount)}
        icon={DollarSign}
        iconColor="text-green-500"
      />
      <StatCard
        label={copy.expenses}
        value={money(summary?.totalCost)}
        icon={TrendingUp}
        iconColor="text-red-500"
      />
      <StatCard
        label={copy.netProfit}
        value={money(summary?.netProfit)}
        icon={BarChart3}
        iconColor="text-blue-500"
      />
      <StatCard
        label={copy.profitMargin}
        value={summary?.profitMargin ? `${summary.profitMargin}%` : '—'}
        icon={PieChart}
        iconColor="text-purple-500"
      />
    </div>
  );
}
