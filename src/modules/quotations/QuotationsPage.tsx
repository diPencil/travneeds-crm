import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  CheckCircle2,
  Send,
  CalendarClock,
  ClipboardList,
  Eye,
  XCircle,
  Clock3,
} from 'lucide-react';
import type { QuotationDirectory } from '../../../shared/quotations/quotation.contracts';
import { quotationTypes, quotationStatuses } from '../../../shared/quotations/quotation.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useApiResource } from '../../lib/http/useApiResource';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataState } from '../../components/ui/DataState';
import { useQuotationText } from './quotation.labels';

export function QuotationsPage() {
  const { text, label, isRTL } = useQuotationText();
  const navigate = useNavigate();
  const [query, setQuery] = useState({ search: '', status: '', type: '', page: '1' });
  const resource = useApiResource<QuotationDirectory>('/quotations?' + new URLSearchParams(query));
  const data = resource.error ? null : resource.data;
  const icons = {
    total: FileText,
    draft: ClipboardList,
    ready: CheckCircle2,
    sent: Send,
    accepted: CheckCircle2,
    booked: CalendarClock,
    expired: Clock3,
    declined: XCircle,
  };
  const filter = (key: keyof typeof query, value: string) =>
    setQuery((previous) => ({ ...previous, page: '1', [key]: value }));
  return (
    <div className="w-full pb-8 space-y-6">
      <PageHeader
        title={text('Quotations', 'الكوتيشنات')}
        description={text(
          'Customer proposals, trip plans and hotel stays in one workflow.',
          'عروض أسعار العملاء وبرامج الرحلات والإقامات الفندقية في مسار واحد.',
        )}
        actions={
          <Button
            className="bg-white text-blue-600 hover:bg-gray-50"
            onClick={() => navigate('/quotations/new')}
          >
            <Plus size={16} />
            {text('New Quotation', 'كوتيشن جديد')}
          </Button>
        }
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {(Object.keys(icons) as (keyof typeof icons)[]).map((key) => (
          <StatCard
            key={key}
            label={key === 'total' ? text('Total Quotations', 'إجمالي الكوتيشنات') : label(key)}
            value={data?.metrics[key] ?? '—'}
            icon={icons[key]}
          />
        ))}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 grid md:grid-cols-[1fr_220px_220px] gap-4">
        <Input
          aria-label={text('Search quotations', 'بحث الكوتيشنات')}
          placeholder={text(
            'Search reference, title or customer...',
            'ابحث بالرقم أو العنوان أو العميل...',
          )}
          value={query.search}
          onChange={(event) => filter('search', event.target.value)}
        />
        <Select
          aria-label={text('Status', 'الحالة')}
          value={query.status}
          onChange={(event) => filter('status', event.target.value)}
        >
          <option value="">{text('All statuses', 'كل الحالات')}</option>
          {quotationStatuses.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={text('Trip type', 'نوع الرحلة')}
          value={query.type}
          onChange={(event) => filter('type', event.target.value)}
        >
          <option value="">{text('All trip types', 'كل أنواع الرحلات')}</option>
          {quotationTypes.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </Select>
      </div>
      <div className="table-container">
        <table className="table-premium">
          <thead>
            <tr>
              {[
                text('Quotation', 'الكوتيشن'),
                text('Customer', 'العميل'),
                text('Trip type', 'نوع الرحلة'),
                text('Total', 'الإجمالي'),
                text('Validity', 'الصلاحية'),
                text('Status', 'الحالة'),
                text('Actions', 'الإجراءات'),
              ].map((title) => (
                <th key={title}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.quotations.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link className="font-bold text-blue-600" to={`/quotations/${item.id}`}>
                    <bdi>{item.reference}</bdi>
                  </Link>
                  <p className="text-sm mt-1">
                    {item.title[isRTL ? 'ar' : 'en'] || item.title[isRTL ? 'en' : 'ar'] || '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {text('Version', 'إصدار')} {item.version}
                  </p>
                </td>
                <td>{item.customerName || '—'}</td>
                <td>{label(item.type)}</td>
                <td className="font-bold">
                  <bdi>
                    {formatFinanceMoney(item.total, item.currency, isRTL ? 'ar-EG' : 'en-US')}
                  </bdi>
                </td>
                <td>
                  <bdi>{item.validUntil || '—'}</bdi>
                </td>
                <td>
                  <StatusBadge
                    variant={
                      item.status === 'booked' || item.status === 'accepted'
                        ? 'emerald'
                        : item.status === 'declined' || item.status === 'expired'
                          ? 'rose'
                          : 'blue'
                    }
                  >
                    {label(item.status)}
                  </StatusBadge>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${text('View', 'عرض')} ${item.reference}`}
                    onClick={() => navigate(`/quotations/${item.id}`)}
                  >
                    <Eye size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DataState {...resource} empty={!data?.quotations.length} retry={resource.reload} />
      </div>
      {data && (
        <div className="flex justify-end items-center gap-4">
          <Button
            variant="outline"
            disabled={data.page === 1}
            onClick={() => filter('page', String(data.page - 1))}
          >
            {text('Previous', 'السابق')}
          </Button>
          <span className="text-sm">
            <bdi>
              {data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </bdi>{' '}
            · {data.total}
          </span>
          <Button
            variant="outline"
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => filter('page', String(data.page + 1))}
          >
            {text('Next', 'التالي')}
          </Button>
        </div>
      )}
    </div>
  );
}
