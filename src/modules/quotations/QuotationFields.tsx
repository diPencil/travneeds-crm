import { useId, useState, lazy, Suspense, type ReactNode } from 'react';
import { Plus, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import type { LocalizedContent } from '../../../shared/quotations/quotation.contracts';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../auth/useAuth';
import { ApiError, apiRequest } from '../../lib/http/api';
import { useQuotationText } from './quotation.labels';

const RichEditor = lazy(() =>
  import('./QuotationRichEditor').then((module) => ({ default: module.QuotationRichEditor })),
);
export function QuotationLocalizedField({
  label,
  value,
  onChange,
  language,
  multiline = false,
  rich = false,
  disabled = false,
  maxLength = 1000,
}: {
  label: string;
  value: LocalizedContent;
  onChange: (value: LocalizedContent) => void;
  language: 'en' | 'ar';
  multiline?: boolean;
  rich?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  if (rich)
    return (
      <Suspense fallback={<p role="status">…</p>}>
        <RichEditor
          key={`${id}:${language}`}
          label={label}
          value={value[language]}
          language={language}
          disabled={disabled}
          onChange={(html) => onChange({ ...value, [language]: html })}
        />
      </Suspense>
    );
  if (multiline)
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <textarea
          id={id}
          value={value[language]}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          lang={language}
          rows={4}
          maxLength={maxLength}
          className="w-full rounded-2xl bg-slate-50 dark:bg-gray-800 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(event) => onChange({ ...value, [language]: event.target.value })}
        />
      </div>
    );
  return (
    <Input
      id={id}
      label={label}
      value={value[language]}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      lang={language}
      maxLength={maxLength}
      onChange={(event) => onChange({ ...value, [language]: event.target.value })}
    />
  );
}
export function QuotationRows({
  title,
  children,
  onAdd,
  addLabel,
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  onAdd: () => void;
  addLabel?: string;
  disabled?: boolean;
}) {
  const { text } = useQuotationText();
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <h2 className="text-lg font-bold">{title}</h2>
        <Button type="button" variant="outline" onClick={onAdd} disabled={disabled}>
          <Plus size={16} />
          {addLabel ?? text('Add', 'إضافة')}
        </Button>
      </div>
      {children}
    </section>
  );
}
export function QuotationRow({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { text } = useQuotationText();
  return (
    <article className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-5">
      <div className="flex justify-between items-center gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          onClick={onRemove}
          aria-label={`${text('Remove', 'حذف')} ${title}`}
        >
          <Trash2 size={16} />
        </Button>
      </div>
      {children}
    </article>
  );
}
export function QuotationImageField({
  label,
  value,
  onChange,
  onUploadState,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  onUploadState: (active: boolean) => void;
}) {
  const { text } = useQuotationText();
  const { csrfToken } = useAuth();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  async function upload(file: File) {
    if (!csrfToken || busy) return;
    setBusy(true);
    setError('');
    onUploadState(true);
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw new Error('INVALID_IMAGE');
      const response = await fetch('/api/quotation-media', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': file.type, 'X-CSRF-Token': csrfToken },
        body: file,
      });
      if (!response.ok) throw new Error('UPLOAD_FAILED');
      const result = (await response.json()) as { id: string };
      onChange(result.id);
    } catch {
      setError(
        text(
          'Could not upload. Use a valid JPG, PNG or WebP up to 8 MB.',
          'تعذّر الرفع. استخدم صورة JPG أو PNG أو WebP صحيحة حتى 8 ميجابايت.',
        ),
      );
    } finally {
      setBusy(false);
      onUploadState(false);
    }
  }
  async function importImage() {
    if (!csrfToken || busy) return;
    setBusy(true);
    setError('');
    onUploadState(true);
    try {
      const result = await apiRequest<{ id: string }>('/quotation-media/import', {
        method: 'POST',
        csrfToken,
        body: { url: url.trim() },
      });
      onChange(result.id);
      setUrl('');
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 429
          ? text('Too many attempts. Try again in a minute.', 'محاولات كتير. جرّب تاني بعد دقيقة.')
          : text(
              'Use a direct public HTTPS link to a JPG, PNG or WebP image up to 8 MB, or upload the file.',
              'استخدم رابط HTTPS عام ومباشر لصورة JPG أو PNG أو WebP حتى 8 ميجابايت، أو ارفع الملف.',
            ),
      );
    } finally {
      setBusy(false);
      onUploadState(false);
    }
  }
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{label}</h3>
      {value && (
        <img
          src={`/api/quotation-media/${value}`}
          alt={label}
          className="h-36 w-full rounded-xl object-cover"
        />
      )}
      <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm">
        <Upload size={16} />
        {text('Upload from device', 'رفع من الجهاز')}
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = '';
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          id={`${id}-url`}
          label={text('Link URL', 'رابط الصورة المباشر')}
          value={url}
          type="url"
          placeholder="https://"
          maxLength={2048}
          disabled={busy}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!url.trim() || busy}
          loading={busy}
          onClick={() => void importImage()}
        >
          <LinkIcon size={16} />
          {text('Add from link', 'إضافة من الرابط')}
        </Button>
        {value && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onChange('')}>
            {text('Remove image', 'إزالة الصورة')}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
