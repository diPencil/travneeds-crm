import { useState } from 'react';
import { Download } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { FinanceReports, FinanceOptions } from '../../../shared/finance/finance.contracts';
import { decimalToMinor, formatFinanceMoney } from '../../../shared/finance/money';
import { reportDateRange, type ReportPeriod } from '../../../shared/finance/report-dates';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataState } from '../../components/ui/DataState';
import { useCsvExport } from '../../hooks/useCsvExport';
import { FinanceHeading, FinanceAvailability } from './FinanceComponents';
import { ReportMetrics } from './FinanceMetrics';
import { useFinanceCopy } from './finance.copy';

export function FinancialReportsPage() {
  const exportCsv = useCsvExport();
  const { user } = useAuth();
  const { copy, intlLocale, isRTL } = useFinanceCopy();
  const [report, setReport] = useState('overview');
  const [period, setPeriod] = useState<ReportPeriod | 'custom'>('month');
  const [range, setRange] = useState(() => reportDateRange('month'));
  const [currency, setCurrency] = useState('');
  const validRange = !range.from || !range.to || range.from <= range.to;
  const query = new URLSearchParams({ ...range, currency }).toString();
  const resource = useApiResource<FinanceReports>(validRange ? '/finance/reports?' + query : null);
  const options = useApiResource<FinanceOptions>('/finance/options');
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  const data = resource.error ? null : resource.data;
  const money = (value: string | null) =>
    formatFinanceMoney(value, data?.currency || '', intlLocale);
  const monthly = data?.monthly ?? [];
  const categories = data?.categories ?? [];
  const agents = data?.agents ?? [];
  const monthlyOptions: ApexOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    noData: { text: copy.noChart },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: [0, 0, 4], curve: 'smooth' },
    xaxis: {
      categories: monthly.map((row) => row.month),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: monthly.length > 0,
        style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 },
      },
    },
    yaxis: {
      show: monthly.length > 0,
      labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } },
    },
    colors: ['#3B82F6', '#EF4444', '#10B981'],
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top', fontWeight: 600 },
    tooltip: {
      y: {
        formatter: (_value: number, context?: { seriesIndex: number; dataPointIndex: number }) => {
          if (!context) return '—';
          const row = monthly[context.dataPointIndex];
          if (!row) return '—';
          return money([row.revenue, row.cost, row.profit][context.seriesIndex] ?? null);
        },
      },
    },
  };
  const monthlySeries = monthly.length
    ? [
        { name: copy.revenue, type: 'column', data: monthly.map((row) => Number(row.revenue)) },
        {
          name: copy.expenses,
          type: 'column',
          data: monthly.map((row) => (row.cost === null ? null : Number(row.cost))),
        },
        {
          name: copy.netProfit,
          type: 'line',
          data: monthly.map((row) => (row.profit === null ? null : Number(row.profit))),
        },
      ]
    : [];
  const canPlotProfit =
    categories.length > 0 &&
    categories.every((row) => row.profit !== null && decimalToMinor(row.profit) >= 0n) &&
    categories.some((row) => row.profit !== null && decimalToMinor(row.profit) > 0n);
  const categoryOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
    noData: { text: copy.noChart },
    labels: categories.map((row) => row.name || copy.uncategorized),
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (_value: number, context?: { seriesIndex: number }) =>
          money(context ? (categories[context.seriesIndex]?.profit ?? null) : null),
      },
    },
  };
  function exportReport() {
    if (!data) return;
    if (report === 'agent')
      exportCsv('agent-financial-report.csv', [
        [
          copy.agent,
          copy.bookings,
          copy.currency,
          copy.revenue,
          copy.expenses,
          copy.netProfit,
          copy.profitMargin,
        ],
        ...agents.map((row) => [
          row.name || copy.unassigned,
          row.bookings,
          data.currency,
          row.revenue,
          row.cost,
          row.profit,
          row.margin,
        ]),
      ]);
    else if (report === 'profit')
      exportCsv('service-profit-report.csv', [
        [copy.kind, copy.bookings, copy.currency, copy.revenue, copy.expenses, copy.netProfit],
        ...categories.map((row) => [
          row.name || copy.uncategorized,
          row.bookings,
          data.currency,
          row.revenue,
          row.cost,
          row.profit,
        ]),
      ]);
    else
      exportCsv('financial-overview-report.csv', [
        [copy.period, copy.currency, copy.revenue, copy.expenses, copy.netProfit],
        ...monthly.map((row) => [row.month, data.currency, row.revenue, row.cost, row.profit]),
      ]);
  }
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <FinanceHeading title={copy.reports} description={copy.subtitle} back />
        <FinanceAvailability source={data?.source} currency={data?.currency} />
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex flex-wrap items-center gap-4">
                <Select
                  aria-label={copy.reports}
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  className="w-56"
                >
                  <option value="overview">{copy.overview}</option>
                  <option value="profit">{copy.profitAnalysis}</option>
                  <option value="agent">{copy.agentPerformance}</option>
                </Select>
                <Select
                  aria-label={copy.period}
                  value={period}
                  onChange={(event) => {
                    const next = event.target.value as typeof period;
                    setPeriod(next);
                    if (next !== 'custom') setRange(reportDateRange(next));
                  }}
                  className="w-48"
                >
                  {(['week', 'month', 'quarter', 'year', 'custom'] as const).map((value) => (
                    <option key={value} value={value}>
                      {copy[value]}
                    </option>
                  ))}
                </Select>
                {period === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="report-from"
                      aria-label={copy.from}
                      type="date"
                      value={range.from}
                      onChange={(event) => setRange({ ...range, from: event.target.value })}
                      className="w-40"
                    />
                    <span className="text-gray-400">{copy.to}</span>
                    <Input
                      id="report-to"
                      aria-label={copy.to}
                      type="date"
                      value={range.to}
                      onChange={(event) => setRange({ ...range, to: event.target.value })}
                      className="w-40"
                    />
                  </div>
                )}
                {options.data && (
                  <Select
                    aria-label={copy.currency}
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="w-32"
                  >
                    <option value="">{options.data.baseCurrency}</option>
                    {options.data.currencies
                      .filter((value) => value !== options.data?.baseCurrency)
                      .map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                  </Select>
                )}
              </div>
              <Button
                disabled={data?.source.status !== 'ready' || resource.error}
                onClick={exportReport}
              >
                <Download className="h-4 w-4" />
                {copy.downloadReport}
              </Button>
            </div>
            {!validRange && (
              <p role="alert" className="text-red-600 mb-6">
                {copy.dateError}
              </p>
            )}
            <p className="text-xs text-gray-500 mb-6">{copy.reportingBasis}</p>
            {report === 'overview' && (
              <div className="space-y-8">
                <ReportMetrics
                  summary={resource.error ? null : (data?.summary ?? null)}
                  currency={data?.currency || ''}
                />
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                  <h2 className="text-lg font-bold mb-6">{copy.revenueChart}</h2>
                  <Chart options={monthlyOptions} series={monthlySeries} type="line" height={350} />
                </div>
              </div>
            )}
            {report === 'profit' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                  <h2 className="text-lg font-bold mb-6">{copy.serviceChart}</h2>
                  <Chart
                    options={categoryOptions}
                    series={canPlotProfit ? categories.map((row) => Number(row.profit)) : []}
                    type="donut"
                    height={300}
                  />
                  {categories.length > 0 && !canPlotProfit && (
                    <p className="text-xs text-gray-500">{copy.profitChartUnavailable}</p>
                  )}
                </div>
                <div className="space-y-4">
                  <h2 className="text-lg font-bold mb-4">{copy.serviceChart}</h2>
                  {categories.map((row) => (
                    <div
                      key={row.name || 'uncategorized'}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-4"
                    >
                      <div>
                        <span className="font-medium">{row.name || copy.uncategorized}</span>
                        <p className="text-xs text-gray-500">
                          {row.bookings} {copy.bookings}
                        </p>
                      </div>
                      <bdi className="font-bold">{money(row.profit)}</bdi>
                    </div>
                  ))}
                  {!categories.length && <p className="text-sm text-gray-500">{copy.noChart}</p>}
                </div>
              </div>
            )}
            {report === 'agent' && (
              <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                <table className="w-full text-start">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {[
                        copy.agent,
                        copy.bookings,
                        copy.revenue,
                        copy.netProfit,
                        copy.profitMargin,
                      ].map((text) => (
                        <th
                          key={text}
                          className="px-6 py-4 text-xs font-bold text-gray-500 uppercase"
                        >
                          {text}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {agents.map((row) => (
                      <tr
                        key={row.id || 'unassigned'}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="px-6 py-4 font-semibold">{row.name || copy.unassigned}</td>
                        <td className="px-6 py-4">{row.bookings}</td>
                        <td className="px-6 py-4 bidi-isolate">{money(row.revenue)}</td>
                        <td className="px-6 py-4 text-green-600 font-bold bidi-isolate">
                          {money(row.profit)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-1 rounded text-xs font-bold bidi-isolate">
                            {row.margin === null ? '—' : `${row.margin}%`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!agents.length && (
                  <p className="p-8 text-center text-sm text-gray-500">{copy.noChart}</p>
                )}
              </div>
            )}
            <DataState {...resource} retry={resource.reload} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
