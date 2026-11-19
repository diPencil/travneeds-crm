import { useState, type FormEvent } from 'react';
import type {
  IntegrationConfiguration,
  IntegrationProvider,
} from '../../../shared/settings/integrations.contracts';
import { integrationDefinitions } from '../../../shared/settings/integration-definitions';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';

export function IntegrationSettingsPanel({ provider }: { provider: IntegrationProvider }) {
  const resource = useApiResource<IntegrationConfiguration>(`/settings/integrations/${provider}`);
  return (
    <>
      <DataState {...resource} retry={resource.reload} />
      {resource.data && !resource.error && (
        <IntegrationForm
          key={`${provider}:${resource.data.version}`}
          initial={resource.data}
          onSaved={resource.reload}
        />
      )}
    </>
  );
}
function IntegrationForm({
  initial,
  onSaved,
}: {
  initial: IntegrationConfiguration;
  onSaved: () => void;
}) {
  const { isRTL, t } = useLocale();
  const { csrfToken } = useAuth();
  const toast = useToastContext();
  const isTranslation = initial.provider === 'translation';
  const [fields, setFields] = useState(initial.fields);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [clearSecrets, setClearSecrets] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(
    initial.enabled || (isTranslation && initial.version === 0),
  );
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const definition = integrationDefinitions[initial.provider];
  const language = isRTL ? 1 : 0;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || busy || checking) return;
    setBusy(true);
    setFeedback('');
    try {
      await apiRequest(`/settings/integrations/${initial.provider}`, {
        method: 'PATCH',
        csrfToken,
        body: {
          fields,
          secrets: isTranslation ? { apiKey: (secrets.apiKey ?? '').trim() } : secrets,
          clearSecrets,
          enabled,
          version: initial.version,
        },
      });
      setSecrets({});
      toast.success(t('settings.saved'));
      onSaved();
    } catch (error) {
      setFeedback(
        error instanceof ApiError && error.code === 'SETTINGS_CONFLICT'
          ? isRTL
            ? 'الإعدادات اتغيرت. أعد تحميل الصفحة قبل التعديل.'
            : 'Configuration changed. Reload before editing.'
          : error instanceof ApiError && error.code === 'INTEGRATION_INCOMPLETE'
            ? isRTL
              ? 'أكمل الحقول المطلوبة والأسرار قبل التفعيل.'
              : 'Complete required fields and credentials before enabling.'
            : isRTL
              ? 'تعذّر حفظ الإعدادات. راجع البيانات وحاول مرة أخرى.'
              : 'Could not save configuration. Review the fields and retry.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function checkTranslation() {
    if (!csrfToken || checking || busy) return;
    setChecking(true);
    setFeedback('');
    try {
      await apiRequest('/content-translation/check', { method: 'POST', csrfToken });
      setFeedback(
        isRTL
          ? 'نجح اختبار الاتصال بالمفتاح المحفوظ.'
          : 'The saved API key passed the connection test.',
      );
    } catch {
      setFeedback(
        isRTL
          ? 'تعذّر اختبار المفتاح. راجع مفتاح API وتفعيل Cloud Translation والفوترة في مشروع Google Cloud.'
          : 'The connection test failed. Check the API key, Cloud Translation enablement and billing in Google Cloud.',
      );
    } finally {
      setChecking(false);
    }
  }
  const visibleFields = isTranslation
    ? definition.fields.filter((field) => field.secret)
    : definition.fields;
  return (
    <form onSubmit={(event) => void save(event)} className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-bold">{definition.title[language]}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isTranslation
              ? isRTL
                ? 'أضف مفتاح Cloud Translation API. عند طلب الترجمة تُرسل الحقول النصية الناقصة ترجمتها في القسم الحالي إلى Google Cloud.'
                : 'Add a Cloud Translation API key. When translation is requested, the current section’s source text for untranslated fields is sent to Google Cloud.'
              : isRTL
                ? 'حفظ الإعدادات مستقل عن اختبار الاتصال الفعلي. الأسرار محفوظة مشفّرة ولا تُعرض مجددًا.'
                : 'Saved configuration is separate from connection verification. Secrets are encrypted and never returned.'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${initial.configurationStatus === 'configured' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
        >
          {initial.configurationStatus === 'configured'
            ? isRTL
              ? 'الإعدادات مكتملة'
              : 'Configuration complete'
            : isRTL
              ? 'الإعدادات غير مكتملة'
              : 'Not configured'}
        </span>
      </div>
      {!initial.encryptionReady && (
        <p role="alert" className="text-amber-700 bg-amber-50 rounded-xl p-3">
          {isRTL
            ? 'مفتاح تشفير الخدمات غير مضبوط على السيرفر. اضبط INTEGRATION_SECRET_KEY لحفظ الأسرار.'
            : 'The server integration encryption key is missing. Configure INTEGRATION_SECRET_KEY before saving credentials.'}
        </p>
      )}
      <label className="flex items-center gap-3 font-medium">
        <input
          type="checkbox"
          role={isTranslation ? 'switch' : undefined}
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        {isTranslation
          ? isRTL
            ? 'إظهار زر الترجمة في الكوتيشن'
            : 'Show translation in quotations'
          : isRTL
            ? 'تفعيل استخدام إعدادات الخدمة'
            : 'Enable this provider configuration'}
      </label>
      <div className="grid md:grid-cols-2 gap-6">
        {visibleFields.map((field) => {
          const id = `integration-${initial.provider}-${field.key}`;
          const label = field.label[language];
          if (field.secret)
            return (
              <div key={field.key} className="space-y-2">
                <Input
                  id={id}
                  label={label}
                  type="password"
                  autoComplete="new-password"
                  value={secrets[field.key] ?? ''}
                  maxLength={4000}
                  disabled={clearSecrets.includes(field.key) || !initial.encryptionReady}
                  placeholder={
                    initial.secrets[field.key]
                      ? isRTL
                        ? 'محفوظ — اتركه فارغًا للاحتفاظ به'
                        : 'Saved — leave empty to keep'
                      : ''
                  }
                  onChange={(event) =>
                    setSecrets((previous) => ({ ...previous, [field.key]: event.target.value }))
                  }
                />
                {initial.secrets[field.key] && (
                  <label className="flex gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={clearSecrets.includes(field.key)}
                      onChange={(event) => {
                        if (isTranslation && event.target.checked) setEnabled(false);
                        setClearSecrets((previous) =>
                          event.target.checked
                            ? [...previous, field.key]
                            : previous.filter((key) => key !== field.key),
                        );
                      }}
                    />
                    {isRTL ? 'مسح السر المحفوظ عند الحفظ' : 'Clear stored credential on save'}
                  </label>
                )}
              </div>
            );
          if (field.options)
            return (
              <Select
                key={field.key}
                id={id}
                label={label}
                value={fields[field.key] ?? ''}
                onChange={(event) =>
                  setFields((previous) => ({ ...previous, [field.key]: event.target.value }))
                }
              >
                {field.options.map((value) => (
                  <option key={value} value={value}>
                    {value || '—'}
                  </option>
                ))}
              </Select>
            );
          return (
            <Input
              key={field.key}
              id={id}
              label={label}
              value={fields[field.key] ?? ''}
              maxLength={500}
              type={field.kind === 'email' ? 'email' : 'text'}
              inputMode={field.kind === 'number' ? 'numeric' : undefined}
              required={enabled && field.required}
              onChange={(event) =>
                setFields((previous) => ({ ...previous, [field.key]: event.target.value }))
              }
            />
          );
        })}
      </div>
      {initial.webhookUrl && (
        <div className="rounded-xl bg-slate-50 dark:bg-gray-800 p-4 space-y-2">
          <h3 className="font-semibold">Webhook URL</h3>
          <p dir="ltr" className="text-sm break-all">
            {initial.webhookUrl}
          </p>
          <p className="text-xs text-gray-500">
            {isRTL
              ? 'القناة تحتاج حساب أعمال وصلاحيات Meta وWebhook عام يعمل بـHTTPS. ضبط الحقول وحده لا يربط الحساب.'
              : 'This channel needs a business account, approved Meta permissions and a public HTTPS webhook. Saving fields alone does not connect an account.'}
          </p>
        </div>
      )}
      {initial.provider === 'smtp' && (
        <p className="text-xs text-gray-500">
          {isRTL
            ? 'حقول البريد الوارد إعدادات فقط؛ سجل Emails يعرض الرسائل التي يرسلها التطبيق.'
            : 'Incoming-mail fields are configuration only; Emails displays application delivery history.'}
        </p>
      )}
      {initial.provider === 'google' && (
        <div className="space-y-2 text-xs text-gray-500">
          <p className="font-semibold">
            {isRTL ? 'رابط إعادة التوجيه المصرّح به' : 'Authorized redirect URI'}
          </p>
          <p dir="ltr" className="break-all">
            {window.location.origin}/api/auth/google/callback
          </p>
          <p>
            {isRTL
              ? 'Google Login مخصص لحسابات الموظفين الحالية الفعّالة، ولا ينشئ حسابات أو صلاحيات جديدة.'
              : 'Google sign-in is restricted to existing active staff. Link it from your account profile.'}
          </p>
        </div>
      )}
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} disabled={checking}>
          {t('common.save')}
        </Button>
        {isTranslation && initial.enabled && initial.configurationStatus === 'configured' && (
          <Button
            type="button"
            variant="outline"
            loading={checking}
            disabled={busy}
            onClick={() => void checkTranslation()}
          >
            {isRTL ? 'اختبار المفتاح المحفوظ' : 'Test saved API key'}
          </Button>
        )}
      </div>
    </form>
  );
}
