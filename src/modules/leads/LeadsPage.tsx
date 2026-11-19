import { Plus, Download, AlertTriangle, Users, Zap, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leadSources, leadStatuses } from '../../../shared/crm/crm.contracts';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from '../auth/useAuth';
import { useCrmDirectory } from '../crm/useCrmDirectory';
import { CrmFilters, CrmActions, CrmPagination } from '../crm/CrmListControls';
import { crmLabel } from '../crm/crm.labels';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataState } from '../../components/ui/DataState';
import { useCsvExport } from '../../hooks/useCsvExport';

export function LeadsPage({ overdue = false }: { overdue?: boolean }) {
  const exportCsv = useCsvExport();
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useCrmDirectory('leads', overdue);
  const value = (key: string) => list.metrics?.[key] ?? '—';
  const conversion =
    list.metrics && Number(list.metrics.total) > 0
      ? `${((Number(list.metrics.converted) / Number(list.metrics.total)) * 100).toFixed(1)}%`
      : '—';
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title={
            overdue
              ? isRTL
                ? 'متابعات متأخرة'
                : 'Overdue Leads'
              : isRTL
                ? 'إدارة العملاء المحتملين'
                : 'Leads Management'
          }
          description={
            isRTL ? 'تابع وأدر الاستفسارات المحتملة' : 'Track and manage potential inquiries'
          }
          actions={
            <>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                onClick={() => navigate(overdue ? '/leads' : '/leads/overdue')}
              >
                <AlertTriangle className="h-4 w-4" />
                {overdue
                  ? isRTL
                    ? 'كل العملاء المحتملين'
                    : 'All Leads'
                  : isRTL
                    ? 'المتأخر'
                    : 'Overdue'}
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                disabled={!list.data || list.error}
                title={isRTL ? 'تصدير الصفحة الحالية' : 'Export current page'}
                onClick={() =>
                  exportCsv('leads.csv', [
                    [
                      'Name',
                      'Email',
                      'Phone',
                      'Source',
                      'Status',
                      'Value',
                      'Currency',
                      'Assigned To',
                    ],
                    ...list.records.map((item) => [
                      item.fullName,
                      item.email,
                      item.phone,
                      item.source || '',
                      item.status,
                      item.valueAmount || '',
                      item.currency || '',
                      item.assignedName || '',
                    ]),
                  ])
                }
              >
                <Download className="h-4 w-4" />
                {isRTL ? 'تصدير' : 'Export'}
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50"
                onClick={() => navigate('/leads/new')}
              >
                <Plus className="h-4 w-4" />
                {isRTL ? 'إضافة عميل محتمل' : 'Add New Lead'}
              </Button>
            </>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            label={isRTL ? 'إجمالي العملاء المحتملين' : 'Total Leads'}
            value={value('total')}
            icon={Users}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            label={isRTL ? 'جديد اليوم (UTC)' : 'New Today (UTC)'}
            value={value('newToday')}
            icon={Zap}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            label={isRTL ? 'المؤهلون' : 'Qualified'}
            value={value('qualified')}
            icon={Target}
            iconColor="text-amber-500"
            iconBg="bg-amber-50 dark:bg-amber-900/20"
          />
          <StatCard
            label={isRTL ? 'التحويل لعملاء' : 'Conversion'}
            value={conversion}
            icon={TrendingUp}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>
        <CrmFilters search={list.filters.search} onSearch={(text) => list.filter('search', text)}>
          <Select
            aria-label={isRTL ? 'الحالة' : 'Status'}
            value={list.filters.status}
            onChange={(event) => list.filter('status', event.target.value)}
            className="w-full md:w-40"
          >
            <option value="">{isRTL ? 'كل الحالات' : 'All Status'}</option>
            {leadStatuses.map((item) => (
              <option key={item} value={item}>
                {crmLabel(item, isRTL)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={isRTL ? 'المصدر' : 'Source'}
            value={list.filters.source}
            onChange={(event) => list.filter('source', event.target.value)}
            className="w-full md:w-40"
          >
            <option value="">{isRTL ? 'كل المصادر' : 'All Sources'}</option>
            {leadSources.map((item) => (
              <option key={item} value={item}>
                {crmLabel(item, isRTL)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={isRTL ? 'الموظف' : 'Agent'}
            value={list.filters.agent}
            onChange={(event) => list.filter('agent', event.target.value)}
            className="w-full md:w-40"
          >
            <option value="">{isRTL ? 'كل الموظفين' : 'All Agents'}</option>
            {list.options.data?.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName}
              </option>
            ))}
          </Select>
          <Select
            aria-label={isRTL ? 'النوع' : 'Type'}
            value={list.filters.type}
            onChange={(event) => list.filter('type', event.target.value)}
            className="w-full md:w-32"
          >
            <option value="">{isRTL ? 'كل الأنواع' : 'All Types'}</option>
            <option>B2B</option>
            <option>B2C</option>
          </Select>
        </CrmFilters>
        {user?.roles.includes('admin') && (
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <input
              type="checkbox"
              checked={list.filters.archived === 'true'}
              onChange={(event) => list.filter('archived', String(event.target.checked))}
            />
            {isRTL ? 'عرض المؤرشف' : 'Show archived'}
          </label>
        )}
        <Card className="rounded-3xl border-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium w-full text-start border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-gray-800/50">
                  {(isRTL
                    ? [
                        'اسم العميل المحتمل',
                        'بيانات التواصل',
                        'المصدر',
                        'النوع',
                        'الأولوية',
                        'القيمة',
                        'الحالة',
                        'المسؤول',
                        'الإجراءات',
                      ]
                    : [
                        'Lead Name',
                        'Contact Info',
                        'Source',
                        'Type',
                        'Priority',
                        'Value',
                        'Status',
                        'Assigned To',
                        'Actions',
                      ]
                  ).map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!list.error &&
                  list.records.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-bold">{item.fullName}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bidi-isolate">
                          LD-{item.id}
                        </div>
                        {item.convertedCustomerId && (
                          <span className="text-[10px] text-emerald-600">
                            {isRTL ? 'تم التحويل' : 'Converted'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs font-medium bidi-isolate">{item.email || '—'}</div>
                        <div className="text-[10px] text-gray-500 bidi-isolate">
                          {item.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {crmLabel(item.source, isRTL)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge variant={item.type === 'B2B' ? 'purple' : 'blue'}>
                          {item.type}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge variant={item.priority === 'High' ? 'rose' : 'blue'}>
                          {crmLabel(item.priority, isRTL)}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="text-xs font-bold bidi-isolate">
                          {item.valueAmount !== null ? `${item.valueAmount} ${item.currency}` : '—'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          variant={
                            ['Qualified', 'Closed Won'].includes(item.status)
                              ? 'emerald'
                              : item.status === 'Closed Lost'
                                ? 'rose'
                                : 'blue'
                          }
                        >
                          {crmLabel(item.status, isRTL)}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="text-xs font-bold">{item.assignedName || '—'}</div>
                      </td>
                      <td className="text-end">
                        <CrmActions kind="leads" record={item} reload={list.reload} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <DataState {...list} empty={!list.records.length} retry={list.reload} />
        </Card>
        {list.data && <CrmPagination {...list.data} onPage={(page) => list.filter('page', page)} />}
      </div>
    </div>
  );
}
