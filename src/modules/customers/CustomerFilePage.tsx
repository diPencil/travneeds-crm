import { ArrowLeft, Briefcase, FileText, Mail, MessageSquare, Pencil, Plus } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  customerFileSections,
  type CustomerFileOverview,
} from '../../../shared/crm/customer-file.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { Card, CardContent } from '../../components/ui/Card';
import { DataState } from '../../components/ui/DataState';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApiResource } from '../../lib/http/useApiResource';
import { getIntlLocale } from '../../localization/config';
import { formatDate, formatNumber } from '../../utils/format';
import { crmLabel } from '../crm/crm.labels';
import { useQuotationText } from '../quotations/quotation.labels';
import { CustomerFileHistory } from './CustomerFileHistory';

const sections = {
  timeline: ['Timeline', 'التسلسل الزمني'],
  leads: ['Lead history', 'سجل الليدز'],
  quotations: ['Quotations', 'الكوتيشنات'],
  bookings: ['Bookings', 'الحجوزات'],
  payments: ['Payments', 'المدفوعات'],
  invoices: ['Invoices', 'الفواتير'],
  inbox: ['Inbox messages', 'رسائل Inbox'],
  emails: ['Emails', 'البريد الإلكتروني'],
} satisfies Record<(typeof customerFileSections)[number], [string, string]>;

export function CustomerFilePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { text, locale, isRTL } = useQuotationText();
  const resource = useApiResource<CustomerFileOverview>(
    id ? `/crm/customers/${encodeURIComponent(id)}/file` : null,
  );
  const data = resource.error ? null : resource.data;
  const currentFile = text('Customer File', 'ملف العميل');
  if (!data)
    return (
      <>
        <PageHeader title={currentFile} />
        <DataState {...resource} retry={resource.reload} />
      </>
    );

  const { customer, totals, finance } = data;
  const url = `/customers/${customer.id}`;
  const allowed = customerFileSections.filter(
    (item) => finance !== null || (item !== 'payments' && item !== 'invoices'),
  );
  const section = allowed.find((item) => item === params.get('section')) ?? 'timeline';
  const requestedPage = Number(params.get('page'));
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10000
      ? requestedPage
      : 1;
  const linkStyle =
    'inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';
  const facts = [
    [text('Email', 'البريد الإلكتروني'), customer.email],
    [text('Phone', 'الهاتف'), customer.phone],
    [text('Company', 'الشركة'), customer.company],
    [text('Nationality', 'الجنسية'), customer.nationality],
    [text('Account owner', 'المسؤول'), customer.assignedName],
    [text('Added on', 'تاريخ الإضافة'), formatDate(customer.createdAt, { locale })],
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={customer.fullName}
        description={`${currentFile} · CUST-${customer.id}`}
        className="mb-0"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/customers" className={linkStyle}>
              <ArrowLeft size={16} className={isRTL ? 'rotate-180' : ''} aria-hidden="true" />
              {text('Customers', 'العملاء')}
            </Link>
            {!customer.archivedAt && (
              <Link to={`${url}/edit`} className={linkStyle}>
                <Pencil size={16} aria-hidden="true" /> {text('Edit profile', 'تعديل البيانات')}
              </Link>
            )}
            {!customer.archivedAt && customer.status !== 'Suspended' && (
              <Link to={`/quotations/new?customerId=${customer.id}`} className={linkStyle}>
                <Plus size={16} aria-hidden="true" /> {text('New quotation', 'كوتيشن جديد')}
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={text(...sections.quotations)}
          value={formatNumber(totals.quotations, { locale })}
          icon={FileText}
          iconColor="text-blue-500"
        />
        <StatCard
          label={text(...sections.bookings)}
          value={formatNumber(totals.bookings, { locale })}
          icon={Briefcase}
          iconColor="text-indigo-500"
        />
        <StatCard
          label={text(...sections.inbox)}
          value={formatNumber(totals.inbox, { locale })}
          icon={MessageSquare}
          iconColor="text-emerald-500"
        />
        <StatCard
          label={text(...sections.emails)}
          value={formatNumber(totals.emails, { locale })}
          icon={Mail}
          iconColor="text-purple-500"
        />
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="me-2 text-lg font-bold">{text('Customer profile', 'بيانات العميل')}</h2>
            <StatusBadge variant="blue">{crmLabel(customer.type, isRTL)}</StatusBadge>
            <StatusBadge variant={customer.status === 'Suspended' ? 'rose' : 'emerald'}>
              {crmLabel(customer.status, isRTL)}
            </StatusBadge>
            {customer.archivedAt && (
              <StatusBadge variant="gray">{text('Archived', 'مؤرشف')}</StatusBadge>
            )}
          </div>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="break-words font-semibold">
                  <bdi>{value || '—'}</bdi>
                </dd>
              </div>
            ))}
          </dl>
          {customer.notes && (
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="mb-1 text-sm font-semibold">{text('Notes', 'الملاحظات')}</h3>
              <p className="whitespace-pre-wrap break-words text-sm" dir="auto">
                {customer.notes}
              </p>
            </div>
          )}
          {finance !== null && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link
                className="me-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                to={`${url}?section=payments`}
              >
                {text('Verified net receipts', 'صافي المقبوضات المؤكدة')}
              </Link>
              {finance.length === 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {text('No verified payments recorded.', 'لا توجد مدفوعات مؤكدة مسجلة.')}
                </span>
              )}
              {finance.map(({ currency, netReceived }) => (
                <StatusBadge key={currency} variant="emerald">
                  <bdi>
                    {formatFinanceMoney(netReceived, currency, getIntlLocale(locale))} · {currency}
                  </bdi>
                </StatusBadge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-3xl border-0 shadow-sm">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <nav aria-label={currentFile} className="flex flex-wrap gap-1.5">
            {allowed.map((item) => (
              <Link
                key={item}
                to={`${url}?section=${item}`}
                aria-current={section === item ? 'page' : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${section === item ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {text(...sections[item])}
              </Link>
            ))}
          </nav>
          {section === 'invoices' && !customer.archivedAt && customer.status !== 'Suspended' && (
            <Link
              to={`/finance/issue-invoice?customerId=${customer.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <Plus size={16} aria-hidden="true" />
              {text('New invoice', 'فاتورة جديدة')}
            </Link>
          )}
          <CustomerFileHistory
            customerId={customer.id}
            section={section}
            page={page}
            title={text(...sections[section])}
          />
        </CardContent>
      </Card>
    </div>
  );
}
