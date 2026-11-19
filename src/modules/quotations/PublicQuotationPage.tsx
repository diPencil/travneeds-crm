import { PublicQuotationChat } from '../inbox/PublicQuotationChat';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/http/api';
import { useParams } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { QuotationFrame } from './QuotationFrame';
import { downloadQuotationPdf, publicQuotationRequest } from './quotation.api';
import { useQuotationText } from './quotation.labels';

export function PublicQuotationPage() {
  const { shareId } = useParams();
  const { text } = useQuotationText();
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [data, setData] = useState<{
    reference: string;
    version: number;
    status: string;
    html: string;
    superseded: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [printFallback, setPrintFallback] = useState(false);
  const printFrame = useRef<HTMLIFrameElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    let current = true;
    void publicQuotationRequest<typeof data>(`/${shareId}?locale=${language}`, token)
      .then((value) => {
        if (current) {
          setData(value);
          setError('');
        }
      })
      .catch(() => {
        if (current) {
          setData(null);
          setError(
            text(
              'This quotation link is invalid, expired or revoked. Please ask your travel consultant for a new link.',
              'رابط الكوتيشن غير صالح أو انتهت صلاحيته أو أُلغي. اطلب رابطًا جديدًا من مسؤول رحلتك.',
            ),
          );
        }
      });
    return () => {
      current = false;
    };
  }, [shareId, token, language, text]);
  async function download() {
    if (!data || busy) return;
    setBusy(true);
    setPrintFallback(false);
    setError('');
    try {
      await downloadQuotationPdf(
        `/public/quotations/${shareId}/pdf?locale=${language}`,
        `quotation-${data.reference}-${language}.pdf`,
        token,
      );
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'PDF_ENGINE_UNAVAILABLE') {
        setPrintFallback(true);
        setError(
          text(
            'Choose Print / Save PDF to save this quotation from your browser.',
            'اختار طباعة / حفظ PDF عشان تحفظ العرض من المتصفح.',
          ),
        );
        return;
      }
      setError(text('Could not download the PDF. Please retry.', 'تعذّر تحميل PDF. حاول مرة أخرى.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#f6f8fb] px-3 sm:px-6 py-5">
      <div className="max-w-[1200px] mx-auto space-y-5">
        <header className="flex flex-wrap gap-3 justify-between items-center">
          <div className="font-bold">
            <bdi>{data?.reference}</bdi>
          </div>
          <div className="flex gap-2">
            <Button
              variant={language === 'en' ? 'primary' : 'outline'}
              onClick={() => setLanguage('en')}
            >
              English
            </Button>
            <Button
              variant={language === 'ar' ? 'primary' : 'outline'}
              onClick={() => setLanguage('ar')}
            >
              العربية
            </Button>
            <Button
              variant="outline"
              disabled={!data}
              aria-expanded={chatOpen}
              onClick={() => setChatOpen(!chatOpen)}
            >
              {language === 'ar' ? 'محادثة' : 'Chat'}
            </Button>
            <Button disabled={!data || busy} loading={busy} onClick={() => void download()}>
              <FileDown size={16} />
              {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
            </Button>
          </div>
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-white p-5 text-sm text-red-700">
            {error}
          </p>
        )}
        {printFallback && data && (
          <Button variant="outline" onClick={() => printFrame.current?.contentWindow?.print()}>
            {text('Print / Save PDF', 'طباعة / حفظ PDF')}
          </Button>
        )}
        {!data && !error && (
          <p role="status">{text('Loading quotation…', 'جارٍ تحميل الكوتيشن…')}</p>
        )}
        {data?.superseded && (
          <p className="text-sm bg-amber-50 text-amber-800 rounded-xl p-4">
            {text(
              'A newer quotation version exists. Contact your consultant before booking.',
              'يوجد إصدار أحدث للكوتيشن. تواصل مع المسؤول قبل الحجز.',
            )}
          </p>
        )}
        {data && shareId && chatOpen && (
          <PublicQuotationChat key={shareId} id={shareId} token={token} locale={language} />
        )}
        {data && (
          <QuotationFrame
            html={data.html}
            title={language === 'ar' ? 'تفاصيل الكوتيشن' : 'Quotation details'}
            printFrame={printFrame}
          />
        )}
      </div>
    </div>
  );
}
