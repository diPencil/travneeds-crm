import { useState } from 'react';
import type { EmailStatus } from '../../../shared/emails/email.contracts';
import { Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ApiError, apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useQuotationText } from '../quotations/quotation.labels';

export function SendQuotationEmail({
  quotationId,
  link,
  recipient,
  locale,
}: {
  quotationId: string;
  link: string;
  recipient: string | null;
  locale: 'en' | 'ar';
}) {
  const { text } = useQuotationText();
  const { csrfToken } = useAuth();
  const [attachPdf, setAttachPdf] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [handled, setHandled] = useState(false);
  async function send() {
    if (!recipient || !csrfToken || busy || handled) return;
    setBusy(true);
    setFeedback('');
    try {
      const parsed = new URL(link);
      const shareId = parsed.pathname.split('/').pop();
      const token = new URLSearchParams(parsed.hash.slice(1)).get('token');
      const result = await apiRequest<{ status: EmailStatus }>(`/emails/quotation/${quotationId}`, {
        method: 'POST',
        csrfToken,
        body: { shareId, token, locale, attachPdf, requestKey },
      });
      setHandled(true);
      setFeedback(
        result.status === 'sent'
          ? text(
              'The mail server accepted the message. See Emails for its record.',
              'خادم البريد قبل الرسالة. هتلاقي السجل في صفحة البريد.',
            )
          : text(
              'Check the result in Emails before retrying.',
              'راجع النتيجة في صفحة البريد قبل إعادة المحاولة.',
            ),
      );
    } catch (error) {
      setFeedback(
        error instanceof ApiError && error.code === 'INTEGRATION_NOT_CONFIGURED'
          ? text(
              'Ask an administrator to set up SMTP in Settings.',
              'اطلب من الأدمن ضبط SMTP من الإعدادات.',
            )
          : text(
              'Could not confirm this send request. Check Emails before retrying.',
              'تعذّر تأكيد طلب الإرسال. راجع صفحة البريد قبل إعادة المحاولة.',
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  if (!recipient)
    return (
      <p className="text-sm">
        {text(
          'Add an email to the customer and save a new quotation revision to send it here.',
          'أضف بريد العميل واحفظ إصدار جديد من الكوتيشن علشان تبعته من هنا.',
        )}
      </p>
    );
  return (
    <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
      <p className="text-sm">
        {text('Send to', 'إرسال إلى')} <bdi className="font-semibold">{recipient}</bdi>
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={attachPdf}
          disabled={busy || handled}
          onChange={(event) => {
            setAttachPdf(event.target.checked);
            setRequestKey(crypto.randomUUID());
          }}
        />
        {text('Attach quotation PDF', 'إرفاق PDF الكوتيشن')}
      </label>
      <Button variant="outline" loading={busy} disabled={handled} onClick={() => void send()}>
        <Mail size={16} />
        {text('Send by email', 'إرسال بالبريد')}
      </Button>
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
    </div>
  );
}
