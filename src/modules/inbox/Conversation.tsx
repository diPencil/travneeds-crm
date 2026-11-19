import { useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import type { InboxMessage, MessageDelivery } from '../../../shared/inbox/inbox.contracts';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/http/api';

export interface History {
  status?: 'open' | 'closed';
  messages: InboxMessage[];
  hasOlder: boolean;
}
type Text = (en: string, ar: string) => string;
const deliveryNames: Record<MessageDelivery, [string, string]> = {
  received: ['Received', 'واردة'],
  sending: ['Sending', 'جارٍ الإرسال'],
  sent: ['Sent', 'مُرسلة'],
  delivered: ['Delivered', 'وصلت'],
  read: ['Read', 'مقروءة'],
  failed: ['Failed', 'فشل الإرسال'],
  unknown: ['Delivery uncertain', 'التسليم غير مؤكد'],
};
export function Conversation({
  text,
  read,
  send,
  guest = false,
  closed,
  onRead,
  maxLength = 4000,
}: {
  text: Text;
  read: (before?: string) => Promise<History>;
  send: (body: string, requestKey: string) => Promise<{ delivery?: string }>;
  guest?: boolean;
  closed?: boolean;
  onRead?: (id: string) => Promise<void>;
  maxLength?: number;
}) {
  const [history, setHistory] = useState<History | null>(null);
  const [older, setOlder] = useState<History | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [body, setBody] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const refresh = useCallback(async () => {
    try {
      const result = await read();
      setHistory(result);
      setRefreshFailed(false);
    } catch {
      setRefreshFailed(true);
    }
  }, [read]);
  useEffect(() => {
    let active = true;
    let timer: number;
    async function load() {
      await refresh();
      if (active) timer = window.setTimeout(() => void load(), 5000);
    }
    void load();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refresh]);
  async function submit() {
    if (sending || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const result = await send(body.trim(), requestKey);
      setBody('');
      setRequestKey(crypto.randomUUID());
      if (result.delivery === 'failed' || result.delivery === 'unknown')
        setError(
          text(
            'Check the provider delivery status before sending again.',
            'راجع حالة التسليم عند مزوّد القناة قبل إعادة الإرسال.',
          ),
        );
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === 'MESSAGE_WINDOW_CLOSED'
          ? text('This channel’s reply window has expired.', 'انتهت مدة الرد المسموحة للقناة.')
          : text(
              'Could not send the message. Check the conversation and retry.',
              'تعذّر إرسال الرسالة. راجع المحادثة وحاول تاني.',
            ),
      );
    } finally {
      setSending(false);
    }
  }
  async function loadOlder() {
    const first = older?.messages[0] ?? history?.messages[0];
    if (!first) return;
    try {
      const result = await read(first.id);
      setOlder((previous) => ({
        ...result,
        messages: [...result.messages, ...(previous?.messages ?? [])],
      }));
    } catch {
      setError(
        text(
          'Could not load earlier messages. Try again.',
          'تعذّر تحميل الرسائل السابقة. حاول تاني.',
        ),
      );
    }
  }
  const messages = [...(older?.messages ?? []), ...(history?.messages ?? [])].filter(
    (message, index, all) => all.findIndex((entry) => entry.id === message.id) === index,
  );
  const incoming = [...messages].reverse().find((message) => message.direction === 'incoming');
  const isClosed = closed || history?.status === 'closed';
  return (
    <section className="space-y-4">
      {refreshFailed && (
        <div role="alert" className="text-rose-600">
          {text('Could not refresh the conversation.', 'تعذّر تحديث المحادثة.')}{' '}
          <button type="button" className="underline" onClick={() => void refresh()}>
            {text('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}
      {!history && !refreshFailed && (
        <p role="status">{text('Loading conversation…', 'جارٍ تحميل المحادثة…')}</p>
      )}
      {(older?.hasOlder ?? history?.hasOlder) && (
        <Button variant="outline" type="button" onClick={() => void loadOlder()}>
          {text('Earlier messages', 'الرسائل السابقة')}
        </Button>
      )}
      {!!messages.length && (
        <ol
          className="max-h-[32rem] space-y-3 overflow-y-auto p-1"
          aria-label={text('Messages', 'الرسائل')}
        >
          {messages.map((message) => (
            <li
              key={message.id}
              className={`w-fit max-w-[90%] rounded-xl p-3 ${(message.direction === 'incoming') === guest ? 'ms-auto bg-blue-50 dark:bg-blue-950' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              <p className="whitespace-pre-wrap break-words" dir="auto">
                {message.body}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <bdi>{new Date(message.createdAt.replace(' ', 'T') + 'Z').toLocaleString()}</bdi>
                {!guest && message.direction === 'outgoing' && (
                  <> · {text(...deliveryNames[message.delivery])}</>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
      {history && !messages.length && (
        <p className="text-gray-500">{text('No messages yet.', 'مفيش رسائل لسه.')}</p>
      )}
      {onRead && incoming && (
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void onRead(incoming.id).catch(() =>
              setError(
                text(
                  'Could not update the read status. Try again.',
                  'تعذّر تحديث حالة القراءة. حاول تاني.',
                ),
              ),
            )
          }
        >
          {text('Mark as read', 'تحديد كمقروءة')}
        </Button>
      )}
      {isClosed ? (
        <p>{text('This conversation is closed.', 'المحادثة مقفولة.')}</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <textarea
            className="min-h-20 flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
            aria-label={text('Message', 'الرسالة')}
            value={body}
            maxLength={maxLength}
            disabled={sending}
            onChange={(event) => {
              setBody(event.target.value);
              setRequestKey(crypto.randomUUID());
            }}
            dir="auto"
          />
          <Button
            type="submit"
            loading={sending}
            disabled={!body.trim() || !history || refreshFailed}
          >
            <Send size={16} />
            {text('Send', 'إرسال')}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
    </section>
  );
}
