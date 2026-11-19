import {
  Bell,
  Briefcase,
  ClipboardList,
  Clock,
  FileText,
  MessagesSquare,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardOverview } from '../../../shared/dashboard/dashboard.contracts';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardContent } from '../../components/ui/Card';
import { DataState } from '../../components/ui/DataState';
import { useLocale } from '../../localization/useLocale';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/format';
import { crmLabel } from '../crm/crm.labels';
import { DashboardCharts } from './DashboardCharts';

const dashboardCard = 'rounded-3xl border-0 shadow-sm';

export function Dashboard() {
  const { t, locale, isRTL } = useLocale();
  const { user } = useAuth();
  const resource = useApiResource<DashboardOverview>('/dashboard');
  const data = resource.error ? null : resource.data;
  const metrics = data?.metrics;
  const count = (value: number | undefined) =>
    value === undefined ? '—' : formatNumber(value, { locale });
  const shortcuts = [
    { label: t('nav.quotations'), icon: FileText, href: '/quotations' },
    { label: t('nav.bookings'), icon: Briefcase, href: '/bookings' },
    { label: t('nav.customers'), icon: Users, href: '/customers' },
    { label: t('nav.catalogue'), icon: ClipboardList, href: '/catalogue/destinations' },
    ...(user?.roles.includes('admin')
      ? [{ label: t('nav.finance'), icon: Wallet, href: '/finance' }]
      : []),
    { label: t('header.notifications'), icon: Bell, href: '/notifications' },
  ];
  const conversion = metrics?.leads
    ? formatPercent(metrics.convertedLeads / metrics.leads, { locale, maximumFractionDigits: 1 })
    : '—';
  const efficiency = metrics?.bookings
    ? formatPercent(metrics.confirmedBookings / metrics.bookings, {
        locale,
        maximumFractionDigits: 1,
      })
    : '—';

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-500/20 sm:p-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-white/80">{t('dashboard.subtitle')}</p>
        </div>
        <nav
          aria-label={t('dashboard.shortcuts')}
          className="flex max-w-full flex-wrap items-center gap-1 rounded-2xl bg-white/10 p-1.5"
        >
          {shortcuts.map(({ label, icon: Icon, href }) => (
            <Link
              key={href}
              to={href}
              aria-label={label}
              title={label}
              className="grid size-10 place-items-center rounded-xl text-white transition-colors hover:bg-white hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Icon size={18} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </header>

      <DataState loading={resource.loading} error={resource.error} retry={resource.reload} />
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            <StatCard
              label={t('nav.quotations')}
              value={count(metrics?.quotations)}
              icon={FileText}
              iconColor="text-blue-500"
            />
            <StatCard
              label={t('dashboard.metrics.totalBookings')}
              value={count(metrics?.bookings)}
              icon={Briefcase}
              iconColor="text-indigo-500"
            />
            <StatCard
              label={t('dashboard.metrics.pendingBookings')}
              value={count(metrics?.pendingBookings)}
              icon={Clock}
              iconColor="text-amber-500"
            />
            <StatCard
              label={t('nav.customers')}
              value={count(metrics?.customers)}
              icon={Users}
              iconColor="text-emerald-500"
            />
            <StatCard
              label={t('dashboard.metrics.conversion')}
              value={conversion}
              icon={TrendingUp}
              iconColor="text-purple-500"
              trend={
                metrics?.leads
                  ? `${count(metrics.convertedLeads)} / ${count(metrics.leads)} · ${t('dashboard.charts.leads')}`
                  : t('dashboard.noLeads')
              }
            />
            <StatCard
              label={t('dashboard.metrics.efficiency')}
              value={efficiency}
              trend={t('dashboard.metrics.efficiencyDescription')}
              icon={ShieldCheck}
              iconColor="text-rose-500"
            />
          </div>
          <DashboardCharts data={data} />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className={dashboardCard}>
              <CardContent className="p-5 sm:p-6">
                <header className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold tracking-tight">
                    {t('dashboard.reminders.title')}
                  </h2>
                  <Clock size={19} className="shrink-0 text-slate-500" aria-hidden="true" />
                </header>
                {!data.reminders.length && (
                  <p className="py-9 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t('dashboard.noReminders')}
                  </p>
                )}
                <ul className="space-y-2">
                  {data.reminders.map((task) => (
                    <li key={task.id}>
                      <Link
                        to={`/leads/${task.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl p-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-slate-800"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold">
                            <bdi>{task.title}</bdi>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <bdi>{formatDateTime(task.time, { locale })}</bdi>
                          </p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium dark:bg-slate-800">
                          {crmLabel(task.priority, isRTL)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/leads/overdue"
                  className="mt-5 block rounded-xl bg-blue-50 px-3 py-3 text-center text-xs font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-blue-900/40 dark:text-blue-200"
                >
                  {t('dashboard.reminders.viewOverdue')}
                </Link>
              </CardContent>
            </Card>
            <Card className={`${dashboardCard} lg:col-span-2`}>
              <CardContent className="p-5 sm:p-6">
                <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold tracking-tight">
                    {t('dashboard.activity.title')}
                  </h2>
                  <Link
                    to="/inbox"
                    className="flex items-center gap-2 rounded px-1 text-sm font-bold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"
                  >
                    {t('dashboard.activity.viewAll')}{' '}
                    <MessagesSquare size={16} aria-hidden="true" />
                  </Link>
                </header>
                {!data.recentIncomingMessages.length && (
                  <p className="py-9 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t('dashboard.activity.empty')}
                  </p>
                )}
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentIncomingMessages.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/inbox?thread=${encodeURIComponent(item.threadId)}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-slate-800"
                      >
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                          aria-hidden="true"
                        >
                          <MessagesSquare size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            <bdi>{item.contactName}</bdi>
                            {item.unread && (
                              <span className="ms-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                {t('dashboard.activity.unread')}
                              </span>
                            )}
                          </p>
                          <p className="line-clamp-2 break-words text-sm" dir="auto">
                            {item.preview}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t(`inbox.channels.${item.channel}`)} ·{' '}
                            <bdi>{formatDateTime(item.createdAt, { locale })}</bdi>
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
