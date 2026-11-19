import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, MessageCircle, MessagesSquare } from 'lucide-react';
import { inboxChannels, type InboxThread } from '../../../shared/inbox/inbox.contracts';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { DataState } from '../../components/ui/DataState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { apiRequest } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from '../auth/useAuth';
import { useQuotationText } from '../quotations/quotation.labels';
import { Conversation, type History } from './Conversation';
import { InboxCustomerLink } from './InboxCustomerLink';

interface Directory {
  threads: InboxThread[];
  total: number;
  pageSize: number;
  metrics: { total: number; open: number; unread: number };
}
export function InboxPage() {
  const { text } = useQuotationText();
  const { t } = useLocale();
  const [filters, setFilters] = useState({ search: '', channel: '', status: '' });
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();
  const threadId = params.get('thread');
  const query = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  const resource = useApiResource<Directory>(`/inbox?${query}`);
  const { reload } = resource;
  useEffect(() => {
    const timer = window.setInterval(reload, 12000);
    return () => window.clearInterval(timer);
  }, [reload]);
  const listedThread = resource.data?.threads.find((thread) => thread.id === threadId);
  const threadResource = useApiResource<InboxThread>(
    threadId && !listedThread ? `/inbox/${encodeURIComponent(threadId)}` : null,
  );
  const active = listedThread ?? (threadResource.error ? null : threadResource.data);
  const update = (key: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={text('Inbox', 'صندوق المحادثات')}
        description={text(
          'Customer conversations across your connected channels.',
          'محادثات العملاء عبر قنواتك المتصلة.',
        )}
      />
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          label={text('Conversations', 'المحادثات')}
          value={resource.data?.metrics.total ?? '—'}
          icon={MessagesSquare}
        />
        <StatCard
          label={text('Open', 'مفتوحة')}
          value={resource.data?.metrics.open ?? '—'}
          icon={MessageCircle}
        />
        <StatCard
          label={text('Unread messages', 'رسائل غير مقروءة')}
          value={resource.data?.metrics.unread ?? '—'}
          icon={Mail}
        />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,1fr)_2fr]">
        <section className="space-y-3 rounded-3xl bg-white p-4 dark:bg-gray-900">
          <Input
            aria-label={text('Search customer', 'بحث العميل')}
            value={filters.search}
            maxLength={120}
            onChange={(event) => update('search', event.target.value)}
          />
          <Select
            aria-label={text('Channel', 'القناة')}
            value={filters.channel}
            onChange={(event) => update('channel', event.target.value)}
          >
            <option value="">{text('All channels', 'كل القنوات')}</option>
            {inboxChannels.map((key) => (
              <option key={key} value={key}>
                {t(`inbox.channels.${key}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={text('Conversation status', 'حالة المحادثة')}
            value={filters.status}
            onChange={(event) => update('status', event.target.value)}
          >
            <option value="">{text('All statuses', 'كل الحالات')}</option>
            <option value="open">{text('Open', 'مفتوحة')}</option>
            <option value="closed">{text('Closed', 'مقفولة')}</option>
          </Select>
          <DataState {...resource} empty={!resource.data?.threads.length} retry={reload} />
          <ul className="space-y-2">
            {resource.data?.threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  aria-pressed={active?.id === thread.id}
                  onClick={() => setParams({ thread: thread.id })}
                  className={`w-full rounded-xl px-3 py-2 text-start ${active?.id === thread.id ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <span className="block font-semibold" dir="auto">
                    {thread.contactName}
                  </span>
                  <span className="text-sm">
                    {t(`inbox.channels.${thread.channel}`)}{' '}
                    {thread.unread > 0 && (
                      <>
                        · {thread.unread} {text('unread', 'غير مقروءة')}
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {resource.data && resource.data.total > resource.data.pageSize && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                {text('Previous', 'السابق')}
              </Button>
              <Button
                variant="outline"
                disabled={page * resource.data.pageSize >= resource.data.total}
                onClick={() => setPage(page + 1)}
              >
                {text('Next', 'التالي')}
              </Button>
            </div>
          )}
        </section>
        <section className="rounded-3xl bg-white p-5 dark:bg-gray-900">
          <DataState {...threadResource} retry={threadResource.reload} />
          {active ? (
            <StaffConversation
              key={active.id}
              thread={active}
              afterChange={() => {
                reload();
                threadResource.reload();
              }}
            />
          ) : (
            !threadId && <p>{text('Select a conversation.', 'اختار محادثة.')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
function StaffConversation({
  thread,
  afterChange,
}: {
  thread: InboxThread;
  afterChange: () => void;
}) {
  const { text } = useQuotationText();
  const { t } = useLocale();
  const { csrfToken, user } = useAuth();
  const { id } = thread;
  const [statusChange, setStatusChange] = useState<typeof thread.status | null>(null);
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const read = useCallback(
    (before?: string) =>
      apiRequest<History>(`/inbox/${id}/messages${before ? `?before=${before}` : ''}`),
    [id],
  );
  const send = useCallback(
    (body: string, requestKey: string) =>
      apiRequest<{ delivery: string }>(`/inbox/${id}/messages`, {
        method: 'POST',
        csrfToken: csrfToken ?? undefined,
        body: { body, requestKey },
      }),
    [csrfToken, id],
  );
  async function update(patch: { status?: typeof thread.status; readThrough?: string }) {
    await apiRequest(`/inbox/${id}`, {
      method: 'PATCH',
      csrfToken: csrfToken ?? undefined,
      body: patch,
    });
    if (patch.status) setStatusChange(patch.status);
    afterChange();
  }
  async function toggle() {
    setError('');
    setChanging(true);
    try {
      await update({ status: (statusChange ?? thread.status) === 'open' ? 'closed' : 'open' });
    } catch {
      setError(
        text('Could not update the conversation. Try again.', 'تعذّر تحديث المحادثة. حاول تاني.'),
      );
    } finally {
      setChanging(false);
    }
  }
  const closed = (statusChange ?? thread.status) === 'closed';
  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 dark:border-gray-700">
        <div>
          <h2 className="font-bold text-lg">{thread.contactName}</h2>
          <p>{t(`inbox.channels.${thread.channel}`)}</p>
        </div>
        <div className="flex items-center gap-3">
          {thread.quotationId && (
            <Link className="text-blue-600" to={`/quotations/${thread.quotationId}`}>
              {text('Open quotation', 'فتح الكوتيشن')}
            </Link>
          )}
          <Button variant="outline" loading={changing} onClick={() => void toggle()}>
            {closed ? text('Reopen', 'إعادة فتح') : text('Close conversation', 'قفل المحادثة')}
          </Button>
        </div>
      </header>
      {thread.channel !== 'web' && user?.roles.includes('admin') && (
        <InboxCustomerLink
          threadId={thread.id}
          customerId={thread.customerId}
          onSaved={afterChange}
        />
      )}
      {error && (
        <p role="alert" className="mb-3 text-rose-600">
          {error}
        </p>
      )}
      <Conversation
        text={text}
        read={read}
        send={send}
        closed={closed}
        maxLength={thread.channel === 'web' ? 4000 : 1000}
        onRead={thread.unread ? (readThrough) => update({ readThrough }) : undefined}
      />
    </>
  );
}
