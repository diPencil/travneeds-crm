import { useCallback } from 'react';
import { ApiError } from '../../lib/http/api';
import { Conversation, type History } from './Conversation';
export function PublicQuotationChat({
  id,
  token,
  locale,
}: {
  id: string;
  token: string;
  locale: 'ar' | 'en';
}) {
  const request = useCallback(
    async (before?: string, input?: { body: string; requestKey: string }) => {
      const result = await fetch(`/api/public/inbox/${id}${before ? `?before=${before}` : ''}`, {
        method: input ? 'POST' : 'GET',
        headers: {
          'X-Quotation-Token': token,
          ...(input ? { 'Content-Type': 'application/json' } : {}),
        },
        body: input ? JSON.stringify(input) : undefined,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!result.ok) throw new ApiError('CHAT_UNAVAILABLE', result.status);
      return result.json() as Promise<History>;
    },
    [id, token],
  );
  const send = useCallback(
    async (body: string, requestKey: string) => {
      await request(undefined, { body, requestKey });
      return {};
    },
    [request],
  );
  const text = (en: string, ar: string) => (locale === 'ar' ? ar : en);
  return (
    <section
      className="rounded-2xl bg-white p-5 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <h2 className="mb-4 text-lg font-bold">
        {text('Chat with your travel consultant', 'تواصل مع مسؤول رحلتك')}
      </h2>
      <Conversation text={text} read={request} send={send} guest />
    </section>
  );
}
