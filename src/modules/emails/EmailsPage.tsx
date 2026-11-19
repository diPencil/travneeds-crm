import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, XCircle, MailCheck, MailQuestion } from 'lucide-react';
import {
  emailStatuses,
  type EmailDirectory,
  type EmailStatus,
} from '../../../shared/emails/email.contracts';
import { useApiResource } from '../../lib/http/useApiResource';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useQuotationText } from '../quotations/quotation.labels';

const names: Record<EmailStatus, [string, string]> = {
  sending: ['Sending', 'جارٍ الإرسال'],
  sent: ['Accepted by mail server', 'قبله خادم البريد'],
  failed: ['Failed', 'فشل الإرسال'],
  unknown: ['Delivery uncertain', 'التسليم غير مؤكد'],
};
const icons = { sending: AlarmClock, sent: MailCheck, failed: XCircle, unknown: MailQuestion };

export function EmailsPage() {
  const { text, isRTL } = useQuotationText();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ search, page: String(page) });
  if (status) query.set('status', status);
  const resource = useApiResource<EmailDirectory>(`/emails?${query}`);
  const data = resource.error ? null : resource.data;
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={text('Emails', 'البريد الإلكتروني')}
        description={text(
          'Track quotation emails sent to customers.',
          'تابع حالة رسائل الكوتيشن المرسلة للعملاء.',
        )}
        actions={
          <Button variant="outline" onClick={resource.reload}>
            {text('Refresh', 'تحديث')}
          </Button>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {emailStatuses.map((key) => (
          <StatCard
            key={key}
            label={text(...names[key])}
            value={data?.counts[key] ?? '—'}
            icon={icons[key]}
          />
        ))}
      </div>
      <div className="grid gap-4 rounded-3xl bg-white p-5 dark:bg-gray-900 sm:grid-cols-[1fr_16rem]">
        <Input
          aria-label={text('Search emails', 'بحث البريد')}
          placeholder={text(
            'Search recipient, subject, or quotation',
            'ابحث بالمستلم أو الموضوع أو الكوتيشن',
          )}
          value={search}
          maxLength={120}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label={text('Delivery status', 'حالة الإرسال')}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{text('All statuses', 'كل الحالات')}</option>
          {emailStatuses.map((key) => (
            <option key={key} value={key}>
              {text(...names[key])}
            </option>
          ))}
        </Select>
      </div>
      <div className="table-container">
        <table className="table-premium">
          <thead>
            <tr>
              {[
                text('Subject', 'الموضوع'),
                text('Recipient', 'المستلم'),
                text('Quotation', 'الكوتيشن'),
                text('Timestamp', 'التوقيت'),
                text('Status', 'الحالة'),
              ].map((item) => (
                <th key={item}>{item}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.deliveries.map((item) => (
              <tr key={item.id}>
                <td className="font-semibold" dir="auto">
                  {item.subject}
                </td>
                <td>
                  <bdi>{item.recipient}</bdi>
                </td>
                <td>
                  <Link className="text-blue-600" to={`/quotations/${item.quotationId}`}>
                    <bdi>{item.quotationReference}</bdi>
                  </Link>
                </td>
                <td>
                  <bdi>
                    {new Date(item.createdAt.replace(' ', 'T') + 'Z').toLocaleString(
                      isRTL ? 'ar-EG' : 'en-US',
                    )}
                  </bdi>
                </td>
                <td>
                  <StatusBadge
                    variant={
                      item.status === 'sent'
                        ? 'emerald'
                        : item.status === 'failed'
                          ? 'rose'
                          : 'blue'
                    }
                  >
                    {text(...names[item.status])}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DataState {...resource} empty={!data?.deliveries.length} retry={resource.reload} />
      </div>
      {data && data.total > data.pageSize && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            {text('Previous', 'السابق')}
          </Button>
          <Button
            variant="outline"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage(page + 1)}
          >
            {text('Next', 'التالي')}
          </Button>
        </div>
      )}
    </div>
  );
}
