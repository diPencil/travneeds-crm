import { useEffect, useState } from 'react';
import { Clock3, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import type {
  LicenseStatus,
  MonthlyLicenseActivation,
} from '../../../shared/settings/settings.contracts';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToastContext } from '../../hooks/useToastContext';
import { ApiError, apiRequest } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useLocale } from '../../localization/useLocale';
import { getIntlLocale } from '../../localization/config';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../auth/useAuth';

export function ActivationPanel() {
  const { isRTL, t } = useLocale();
  const { csrfToken } = useAuth();
  const toast = useToastContext();
  const resource = useApiResource<LicenseStatus>('/settings/activation');
  const [issued, setIssued] = useState<MonthlyLicenseActivation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const license = issued?.license ?? (resource.error ? null : resource.data);

  async function activate() {
    if (!license?.activationAvailable || !csrfToken || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<MonthlyLicenseActivation>('/settings/activate', {
        method: 'POST',
        csrfToken,
        body: {},
      });
      setIssued(result);
      toast.success(isRTL ? 'تم تفعيل الترخيص الشهري.' : 'Monthly license activated.');
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'LOCAL_LICENSE_ALREADY_ISSUED')
        resource.reload();
      setError(
        isRTL
          ? 'تعذّر إصدار الترخيص. حدّث الحالة وحاول مرة أخرى.'
          : 'Could not issue the license. Refresh the status and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function copySerial(serial: string) {
    try {
      await navigator.clipboard.writeText(serial);
      toast.success(isRTL ? 'تم نسخ كود التفعيل.' : 'Activation code copied.');
    } catch {
      toast.error(
        isRTL
          ? 'تعذّر النسخ. انسخ الكود من الحقل يدويًا.'
          : 'Could not copy. Select the code and copy it manually.',
      );
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="activation-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="activation-heading" className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck size={20} className="text-blue-600 dark:text-blue-300" aria-hidden="true" />
          {t('settings.activation')}
        </h2>
        <a
          href="https://panel.dipencil.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-blue-950 dark:text-blue-200"
        >
          <ExternalLink size={16} aria-hidden="true" />
          {isRTL ? 'إدارة الترخيص' : 'Manage License'}
        </a>
      </div>
      <DataState {...resource} retry={resource.reload} />
      {license && (
        <LicenseDetails
          key={license.serverTime}
          license={license}
          serial={issued?.serial}
          onCopy={copySerial}
        />
      )}
      {license?.activationAvailable && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isRTL
              ? 'يصدر التفعيل المحلي مرة واحدة ويستمر شهرًا من تاريخ الإصدار.'
              : 'Local activation starts a one-month term and is issued once per installation.'}
          </p>
          <Button type="button" loading={busy} onClick={() => void activate()}>
            {isRTL ? 'تفعيل لمدة شهر' : 'Activate for one month'}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}

function LicenseDetails({
  license,
  serial,
  onCopy,
}: {
  license: LicenseStatus;
  serial?: string;
  onCopy: (serial: string) => Promise<void>;
}) {
  const { locale, isRTL, t } = useLocale();
  const [clock, setClock] = useState(Date.now);
  const [offset] = useState(() => Date.parse(license.serverTime) - Date.now());
  const expiry = license.expiresAt ? Date.parse(license.expiresAt) : null;
  useEffect(() => {
    if (expiry === null || license.status !== 'active') return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiry, license.status]);
  const remaining = expiry === null ? 0 : Math.max(0, Math.ceil((expiry - clock - offset) / 1000));
  const status = license.status === 'active' && remaining === 0 ? 'expired' : license.status;
  const numbers = new Intl.NumberFormat(getIntlLocale(locale), {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  const timer = [
    [Math.floor(remaining / 86400), isRTL ? 'يوم' : 'Days'],
    [Math.floor((remaining % 86400) / 3600), isRTL ? 'ساعة' : 'Hours'],
    [Math.floor((remaining % 3600) / 60), isRTL ? 'دقيقة' : 'Minutes'],
    [remaining % 60, isRTL ? 'ثانية' : 'Seconds'],
  ] as const;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{t('settings.licenseStatus')}</span>
        <StatusBadge
          variant={status === 'active' ? 'emerald' : status === 'expired' ? 'amber' : 'gray'}
        >
          {t(`settings.license.${status}`)}
        </StatusBadge>
        {license.plan && <StatusBadge variant="blue">{t(`settings.${license.plan}`)}</StatusBadge>}
      </div>
      {license.expiresAt && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold">{t('settings.serial')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code
                className="select-all break-all rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
                dir="ltr"
              >
                {serial ?? (license.serialSuffix ? `TN-••••••-${license.serialSuffix}` : '—')}
              </code>
              {serial && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onCopy(serial)}
                >
                  <Copy size={15} aria-hidden="true" />
                  {isRTL ? 'نسخ' : 'Copy'}
                </Button>
              )}
            </div>
            {serial && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isRTL
                  ? 'الكود الكامل ظاهر مرة واحدة عند التفعيل.'
                  : 'The full code is shown once, when issued.'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 size={17} aria-hidden="true" />
              {isRTL ? 'الوقت المتبقي' : 'Time remaining'}
            </p>
            <div role="timer" className="grid max-w-sm grid-cols-4 gap-1.5">
              {timer.map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl bg-blue-50 px-1 py-2 text-center text-blue-800 dark:bg-blue-950 dark:text-blue-100"
                >
                  <bdi className="block text-lg font-semibold tabular-nums">
                    {numbers.format(value)}
                  </bdi>
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isRTL ? 'ينتهي في' : 'Expires on'}{' '}
              <bdi>{formatDateTime(license.expiresAt, { locale })}</bdi>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
