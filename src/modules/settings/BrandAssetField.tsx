import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import {
  localBrandAssetPath,
  localBrandAssetPathLimit,
} from '../../../shared/settings/settings.contracts';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';

function BrandAssetPreview({ kind, value }: { kind: 'logo' | 'favicon'; value: string }) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  const canPreview =
    value.length <= localBrandAssetPathLimit && localBrandAssetPath.test(value) && !failed;
  const isLogo = kind === 'logo';

  return (
    <div
      className={`flex h-24 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 ${isLogo ? 'w-24 sm:w-32' : 'w-24'}`}
    >
      {canPreview ? (
        <img
          src={value}
          alt={t(isLogo ? 'settings.logoPreview' : 'settings.faviconPreview')}
          onError={() => setFailed(true)}
          className={isLogo ? 'max-h-full max-w-full object-contain' : 'size-9 object-contain'}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-center text-xs text-slate-600">
          <ImageOff aria-hidden="true" size={18} />
          <span>{t('settings.assetPreviewUnavailable')}</span>
        </div>
      )}
    </div>
  );
}

export function BrandAssetField({
  kind,
  label,
  value,
  disabled,
  onChange,
  onBusy,
}: {
  kind: 'logo' | 'favicon';
  label: string;
  value: string;
  disabled: boolean;
  onChange: (url: string) => void;
  onBusy: (active: boolean) => void;
}) {
  const { csrfToken } = useAuth();
  const { isRTL } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function upload(file: File) {
    if (!csrfToken || busy) return;
    setBusy(true);
    onBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/settings/brand-assets/${kind}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-CSRF-Token': csrfToken,
        },
        body: file,
      });
      if (!response.ok) throw new Error('Upload failed');
      const { url } = (await response.json()) as { url: string };
      onChange(url);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
      <BrandAssetPreview key={value} kind={kind} value={value} />
      <div className="min-w-0 flex-1 space-y-3">
        <Input
          id={`${kind}-url`}
          label={label}
          value={value}
          required
          pattern="/[^/].*"
          maxLength={localBrandAssetPathLimit}
          disabled={disabled || busy}
          onChange={(event) => onChange(event.target.value)}
          dir="ltr"
        />
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span>{isRTL ? 'رفع من الجهاز' : 'Upload from device'}</span>
          <input
            type="file"
            className="max-w-full"
            aria-label={`${isRTL ? 'رفع' : 'Upload'} ${label}`}
            disabled={disabled || busy}
            accept={kind === 'favicon' ? '.png,.jpg,.jpeg,.webp,.ico' : '.png,.jpg,.jpeg,.webp'}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
        </label>
        {busy && <p role="status">{isRTL ? 'جارٍ الرفع…' : 'Uploading…'}</p>}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {isRTL
              ? 'تعذّر الرفع. استخدم صورة صالحة حتى 512 كيلوبايت.'
              : 'Upload failed. Use a supported image up to 512 KB.'}
          </p>
        )}
      </div>
    </div>
  );
}
