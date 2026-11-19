import { Plus, Download, Clock, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierStatuses } from '../../../shared/crm/crm.contracts';
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
import { DataState } from '../../components/ui/DataState';
import { useCsvExport } from '../../hooks/useCsvExport';

export function SuppliersPage() {
  const exportCsv = useCsvExport();
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useCrmDirectory('suppliers');
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title={isRTL ? 'متابعة الموردين' : 'Supplier Tracker'}
          description={
            isRTL
              ? 'إدارة الموردين وجهات التواصل'
              : 'Manage supplier partnerships and contact details'
          }
          actions={
            <>
              <Button
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                disabled={!list.data || list.error}
                title={isRTL ? 'تصدير الصفحة الحالية' : 'Export current page'}
                onClick={() =>
                  exportCsv('suppliers.csv', [
                    ['Name', 'Email', 'Phone', 'Category', 'Country', 'City', 'Status'],
                    ...list.records.map((item) => [
                      item.fullName,
                      item.email,
                      item.phone,
                      item.category || '',
                      item.country || '',
                      item.city || '',
                      item.status,
                    ]),
                  ])
                }
              >
                <Download className="h-4 w-4" />
                {isRTL ? 'تصدير' : 'Export'}
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50"
                onClick={() => navigate('/suppliers/new')}
              >
                <Plus className="h-4 w-4" />
                {isRTL ? 'مورد جديد' : 'New Supplier'}
              </Button>
            </>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            label={isRTL ? 'طلبات معلقة' : 'Pending Requests'}
            value="—"
            icon={Clock}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            label={isRTL ? 'متوسط الاستجابة' : 'Average Response'}
            value="—"
            icon={TrendingUp}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            label={isRTL ? 'أفضل شريك' : 'Top Partner'}
            value="—"
            icon={Star}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            label={isRTL ? 'متأخرات حرجة' : 'Critical Overdue'}
            value="—"
            icon={AlertTriangle}
            iconColor="text-rose-500"
            iconBg="bg-rose-50 dark:bg-rose-900/20"
          />
        </div>
        <CrmFilters search={list.filters.search} onSearch={(text) => list.filter('search', text)}>
          <Select
            aria-label={isRTL ? 'الحالة' : 'Status'}
            value={list.filters.status}
            onChange={(event) => list.filter('status', event.target.value)}
            className="w-full md:w-48"
          >
            <option value="">{isRTL ? 'كل الحالات' : 'All Status'}</option>
            {supplierStatuses.map((item) => (
              <option key={item} value={item}>
                {crmLabel(item, isRTL)}
              </option>
            ))}
          </Select>
        </CrmFilters>
        <div className="flex items-center justify-between gap-4 text-xs text-gray-500 mb-4">
          <p>
            {isRTL ? 'إجمالي الموردين: ' : 'Total Suppliers: '}
            {list.metrics?.total ?? '—'} · {isRTL ? 'نشط: ' : 'Active: '}
            {list.metrics?.active ?? '—'}
          </p>
          {user?.roles.includes('admin') && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={list.filters.archived === 'true'}
                onChange={(event) => list.filter('archived', String(event.target.checked))}
              />
              {isRTL ? 'عرض المؤرشف' : 'Show archived'}
            </label>
          )}
        </div>
        <Card className="rounded-3xl border-0 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  {(isRTL
                    ? [
                        'الشريك',
                        'حجم العمل',
                        'الأداء',
                        'معدل الاستجابة',
                        'التقييم',
                        'التواصل',
                        'الإجراءات',
                      ]
                    : [
                        'Partner',
                        'Volume',
                        'Performance',
                        'Response Rate',
                        'Rating',
                        'Contact',
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
                        <div className="text-xs text-gray-500">
                          {item.category} · {crmLabel(item.status, isRTL)}
                        </div>
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        <div className="text-xs font-medium bidi-isolate">{item.email || '—'}</div>
                        <div className="text-[10px] text-gray-500 bidi-isolate">
                          {item.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <CrmActions kind="suppliers" record={item} reload={list.reload} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <DataState {...list} empty={!list.records.length} retry={list.reload} />
        </Card>
        <p className="mt-6 text-xs text-gray-500">
          {isRTL
            ? 'مؤشرات الأداء والطلبات تُحسب بعد ربط العمليات والحجوزات.'
            : 'Performance and request metrics require operations and booking integration.'}
        </p>
        {list.data && <CrmPagination {...list.data} onPage={(page) => list.filter('page', page)} />}
      </div>
    </div>
  );
}
