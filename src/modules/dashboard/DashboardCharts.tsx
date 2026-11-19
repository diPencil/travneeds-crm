import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import {
  dashboardPeriods,
  type DashboardOverview,
  type DashboardPeriod,
} from '../../../shared/dashboard/dashboard.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { Card, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { useLocale } from '../../localization/useLocale';
import { getIntlLocale } from '../../localization/config';
import { useBranding } from '../settings/useBranding';
import { crmLabel } from '../crm/crm.labels';

const sourceColors: Record<DashboardOverview['leadSources'][number]['source'], string> = {
  Website: '#2563eb',
  'Social Media': '#10b981',
  Referral: '#8b5cf6',
  Email: '#0e7490',
  'Walk-in': '#b45309',
  'Cold Call': '#be185d',
};

export function DashboardCharts({ data }: { data: DashboardOverview }) {
  const { t, locale, isRTL } = useLocale();
  const { branding } = useBranding();
  const [period, setPeriod] = useState<DashboardPeriod>('monthly');
  const trend = data.trend[period];
  const intlLocale = getIntlLocale(locale);
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    month: 'short',
    ...(period === 'weekly' ? { day: 'numeric' } : { year: '2-digit' }),
  });
  const labels = trend.map((entry) => dateFormatter.format(new Date(entry.date + 'T00:00:00Z')));
  const numbers = new Intl.NumberFormat(intlLocale);
  const brand = branding?.primaryColor ?? '#2563eb';
  const leadColors = data.leadSources.map(({ source }) => sourceColors[source]);
  const trendOptions: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      animations: { enabled: false },
      background: 'transparent',
      fontFamily: 'inherit',
    },
    colors: [brand, '#0d9488'],
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.08 } },
    xaxis: { categories: labels, labels: { style: { colors: 'currentColor' } } },
    yaxis: {
      min: 0,
      decimalsInFloat: 0,
      forceNiceScale: true,
      labels: {
        style: { colors: 'currentColor' },
        formatter: (value) => (Number.isInteger(value) ? numbers.format(value) : ''),
      },
    },
    tooltip: { theme: 'light', shared: true, intersect: false },
    legend: { position: 'bottom', labels: { colors: 'currentColor' } },
  };
  const emptyClass =
    'grid min-h-48 place-items-center px-4 text-center text-sm text-slate-500 dark:text-slate-400';
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="min-w-0 rounded-3xl border-0 shadow-sm lg:col-span-2">
        <CardContent className="p-5 sm:p-6">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight">
              {t('dashboard.charts.travelTrend')}
            </h2>
            <div className="min-w-32">
              <Select
                aria-label={t('dashboard.charts.period')}
                value={period}
                onChange={(event) => {
                  const next = dashboardPeriods.find((item) => item === event.target.value);
                  if (next) setPeriod(next);
                }}
              >
                {dashboardPeriods.map((item) => (
                  <option key={item} value={item}>
                    {t(`dashboard.charts.filter.${item}`)}
                  </option>
                ))}
              </Select>
            </div>
          </header>
          {trend.some(({ bookings, quotations }) => bookings || quotations) ? (
            <>
              <div aria-hidden="true">
                <ReactApexChart
                  options={trendOptions}
                  series={[
                    { name: t('nav.quotations'), data: trend.map((point) => point.quotations) },
                    { name: t('nav.bookings'), data: trend.map((point) => point.bookings) },
                  ]}
                  type="area"
                  height={245}
                />
              </div>
              <ul className="sr-only" aria-label={t('dashboard.charts.travelTrend')}>
                {trend.map((point, index) => (
                  <li key={point.date}>
                    {labels[index]} · {t('nav.quotations')} {numbers.format(point.quotations)} ·{' '}
                    {t('nav.bookings')} {numbers.format(point.bookings)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={emptyClass}>{t('dashboard.charts.noTravel')}</p>
          )}
          {data.bookedValue !== null && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link
                to="/finance"
                className="rounded text-sm font-semibold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"
              >
                {t('dashboard.bookedValue')}
              </Link>
              {data.bookedValue.length ? (
                <ul className="flex flex-wrap gap-2">
                  {data.bookedValue.map(({ currency, amount }) => (
                    <li
                      key={currency}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-100"
                    >
                      <bdi>{formatFinanceMoney(amount, currency, intlLocale)}</bdi>
                      <span className="ms-1 text-xs font-medium">{currency}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('dashboard.noBookedValue')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="min-w-0 rounded-3xl border-0 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold tracking-tight">
            {t('dashboard.charts.leadDistribution')}
          </h2>
          {!data.leadSources.length ? (
            <p className={emptyClass}>{t('dashboard.noLeads')}</p>
          ) : (
            <>
              <div aria-hidden="true">
                <ReactApexChart
                  options={{
                    chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: false } },
                    labels: data.leadSources.map(({ source }) => crmLabel(source, isRTL)),
                    colors: leadColors,
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    stroke: { show: false },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '75%',
                          labels: {
                            show: true,
                            total: {
                              show: true,
                              showAlways: true,
                              label: t('dashboard.charts.leads'),
                              formatter: () => numbers.format(data.metrics.leads),
                              color: 'currentColor',
                            },
                            value: { color: 'currentColor' },
                          },
                        },
                      },
                    },
                  }}
                  series={data.leadSources.map(({ count }) => count)}
                  type="donut"
                  height={205}
                />
              </div>
              <ul className="space-y-1.5">
                {data.leadSources.map(({ source, count }, index) => (
                  <li key={source} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: leadColors[index] }}
                    />
                    <span className="min-w-0 flex-1">{crmLabel(source, isRTL)}</span>
                    <bdi className="font-semibold">{numbers.format(count)}</bdi>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
