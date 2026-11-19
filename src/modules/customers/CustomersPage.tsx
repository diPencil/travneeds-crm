import { Link } from 'react-router-dom';
import { Plus, Download, Building2, Users, Activity, Star, TrendingUp, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerTypes, customerStatuses } from '../../../shared/crm/crm.contracts';
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

export function CustomersPage({ corporate = false }: { corporate?: boolean }) {
  const exportCsv = useCsvExport();
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useCrmDirectory('customers', false, corporate ? 'Corporate' : '');
  const value = (key: string) => list.metrics?.[key] ?? '—';
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title={isRTL ? 'دليل العملاء' : 'Customer Directory'}
          description={
            isRTL
              ? 'إدارة علاقات الأفراد والشركات'
              : 'Manage individual and corporate relationships'
          }
          actions={
            <>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                onClick={() => {
                  list.filter('type', list.filters.type === 'Corporate' ? '' : 'Corporate');
                }}
              >
                <Building2 className="h-4 w-4" />
                {isRTL ? 'الشركات' : 'Corporate Accounts'}
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                disabled={!list.data || list.error}
                title={isRTL ? 'تصدير الصفحة الحالية' : 'Export current page'}
                onClick={() =>
                  exportCsv('customers.csv', [
                    ['Name', 'Email', 'Phone', 'Type', 'Status', 'Nationality'],
                    ...list.records.map((item) => [
                      item.fullName,
                      item.email,
                      item.phone,
                      item.type || '',
                      item.status,
                      item.nationality || '',
                    ]),
                  ])
                }
              >
                <Download className="h-4 w-4" />
                {isRTL ? 'تصدير' : 'Export'}
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-50"
                onClick={() => navigate('/customers/new')}
              >
                <Plus className="h-4 w-4" />
                {isRTL ? 'إضافة عميل' : 'Add Customer'}
              </Button>
            </>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            label={isRTL ? 'إجمالي العملاء' : 'Total Profiles'}
            value={value('total')}
            icon={Users}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            label={isRTL ? 'العملاء النشطون' : 'Active Clients'}
            value={value('active')}
            icon={Activity}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            label={isRTL ? 'العملاء المميزون' : 'VIP Clients'}
            value={value('vip')}
            icon={Star}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            label={isRTL ? 'إجمالي الإنفاق' : 'Life Time Value'}
            value="—"
            icon={TrendingUp}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-50 dark:bg-indigo-900/20"
          />
        </div>
        <CrmFilters search={list.filters.search} onSearch={(text) => list.filter('search', text)}>
          <Select
            aria-label={isRTL ? 'النوع' : 'Type'}
            value={list.filters.type}
            onChange={(event) => list.filter('type', event.target.value)}
            className="w-full md:w-48"
          >
            <option value="">{isRTL ? 'كل الأنواع' : 'All Types'}</option>
            {customerTypes.map((item) => (
              <option key={item} value={item}>
                {crmLabel(item, isRTL)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={isRTL ? 'الحالة' : 'Status'}
            value={list.filters.status}
            onChange={(event) => list.filter('status', event.target.value)}
            className="w-full md:w-48"
          >
            <option value="">{isRTL ? 'كل الحالات' : 'All Status'}</option>
            {customerStatuses.map((item) => (
              <option key={item} value={item}>
                {crmLabel(item, isRTL)}
              </option>
            ))}
          </Select>
          <Button
            disabled
            className="h-12 rounded-2xl bg-blue-50 text-blue-600"
            title={
              isRTL
                ? 'إرسال الحملات يحتاج ربط خدمة بريد'
                : 'Campaign delivery requires an email integration'
            }
          >
            <Mail className="h-4 w-4" />
            {isRTL ? 'حملة بريدية' : 'Campaign'}
          </Button>
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
        <Card className="rounded-3xl border-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] bg-white dark:bg-gray-900 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="table-premium w-full text-start border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-gray-800/50">
                  {(isRTL
                    ? [
                        'اسم العميل',
                        'بيانات التواصل',
                        'التصنيف',
                        'الجنسية',
                        'الحالة',
                        'الحجوزات',
                        'إجمالي الإنفاق',
                        'الإجراءات',
                      ]
                    : [
                        'Customer Name',
                        'Contact Details',
                        'Category',
                        'Nationality',
                        'Status',
                        'Bookings',
                        'Total Spent',
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
                          CUST-{item.id}
                        </div>
                      </td>
                      <td>
                        <div className="text-xs font-medium bidi-isolate">{item.email || '—'}</div>
                        <div className="text-[10px] text-gray-500 bidi-isolate">
                          {item.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge variant={item.type === 'Corporate' ? 'indigo' : 'blue'}>
                          {crmLabel(item.type, isRTL)}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="text-xs font-medium">{item.nationality || '—'}</div>
                      </td>
                      <td>
                        <StatusBadge
                          variant={
                            item.status === 'Suspended'
                              ? 'rose'
                              : item.status === 'VIP'
                                ? 'purple'
                                : 'emerald'
                          }
                        >
                          {crmLabel(item.status, isRTL)}
                        </StatusBadge>
                      </td>
                      <td>
                        <Link
                          className="text-xs font-bold text-blue-600 hover:underline"
                          to={`/bookings?customerId=${item.id}`}
                          aria-label={`${isRTL ? 'حجوزات' : 'Bookings for'} ${item.fullName}`}
                        >
                          {item.bookingCount ?? '—'}
                        </Link>
                      </td>
                      <td>
                        <div className="text-xs font-bold text-emerald-600">—</div>
                      </td>
                      <td className="text-end">
                        {item.status !== 'Suspended' && !item.archivedAt && (
                          <Link
                            to={`/quotations/new?customerId=${item.id}`}
                            className="me-2 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            {isRTL ? 'كوتيشن جديد' : 'New quotation'}
                          </Link>
                        )}
                        <CrmActions kind="customers" record={item} reload={list.reload} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <DataState {...list} empty={!list.records.length} retry={list.reload} />
        </Card>
        <p className="text-xs text-gray-500">
          {isRTL
            ? 'العدد يشمل الحجوزات المؤكدة والمكتملة المتاحة لحسابك. بيانات الإنفاق تعتمد على المدفوعات المسجلة.'
            : 'Counts include confirmed and completed bookings available to your account. Spending requires recorded payments.'}
        </p>
        {list.data && <CrmPagination {...list.data} onPage={(page) => list.filter('page', page)} />}
      </div>
    </div>
  );
}
