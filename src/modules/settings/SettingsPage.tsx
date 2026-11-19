import { useEffect, useState, type FormEvent } from 'react';
import type { SettingsResponse } from '../../../shared/settings/settings.contracts';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { BrandAssetField } from './BrandAssetField';
import { ActivationPanel } from './ActivationPanel';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../../lib/http/api';
import { useBranding } from './useBranding';
import { readSettings, saveSettings } from './settings.api';

import {
  integrationProviders,
  type IntegrationProvider,
} from '../../../shared/settings/integrations.contracts';
import { integrationDefinitions } from '../../../shared/settings/integration-definitions';
import { IntegrationSettingsPanel } from './IntegrationSettingsPanel';
import { CurrencySettingsPanel } from './CurrencySettingsPanel';

const tabs = ['identity', 'currency', ...integrationProviders, 'activation'] as const;
type SettingsTab = (typeof tabs)[number];

export function SettingsPage() {
  const { t, isRTL } = useLocale();
  const { user, csrfToken } = useAuth();
  const toast = useToastContext();
  const { updateBranding } = useBranding();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [tab, setTab] = useState<SettingsTab>('identity');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    if (!user?.roles.includes('admin')) return;
    const controller = new AbortController();
    void readSettings(controller.signal)
      .then(setData)
      .catch((failure) => {
        if (!controller.signal.aborted)
          setFeedback(failure instanceof ApiError ? failure.code : 'SERVER_ERROR');
      });
    return () => controller.abort();
  }, [user, loadVersion]);

  if (!user?.roles.includes('admin')) return <PageHeader title={t('settings.forbidden')} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !csrfToken || uploading > 0 || saving) return;
    setSaving(true);
    setFeedback('');
    try {
      const settings = await saveSettings(data.settings, csrfToken);
      setData({ ...data, settings });
      updateBranding(settings);
      toast.success(t('settings.saved'));
    } catch (failure) {
      setFeedback(failure instanceof ApiError ? failure.code : 'SERVER_ERROR');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof SettingsResponse['settings'], value: string) => {
    setData(
      (current) => current && { ...current, settings: { ...current.settings, [field]: value } },
    );
  };
  const message = feedback === 'SETTINGS_CONFLICT' ? t('settings.conflict') : t('settings.failed');

  return (
    <div className="page-container">
      <PageHeader title={t('nav.settings')} description={t('workspace.settingsDescription')} />
      <div className="grid items-start gap-6 lg:grid-cols-[225px_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label={t('nav.settings')}
          aria-orientation="vertical"
          className="grid grid-cols-2 gap-1 rounded-3xl bg-white p-3 shadow-sm dark:bg-gray-900 sm:grid-cols-3 lg:sticky lg:top-24 lg:grid-cols-1"
        >
          {tabs.map((item) => (
            <button
              key={item}
              role="tab"
              id={`settings-tab-${item}`}
              aria-controls={`settings-panel-${item}`}
              aria-selected={tab === item}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                const next =
                  event.key === 'Home'
                    ? tabs[0]
                    : event.key === 'End'
                      ? tabs[tabs.length - 1]
                      : tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
                setTab(next);
                document.getElementById(`settings-tab-${next}`)?.focus();
              }}
              onClick={() => setTab(item)}
              className={`shrink-0 rounded-xl px-3 py-2.5 text-start text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-500 ${tab === item ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
            >
              {item === 'identity' || item === 'currency' || item === 'activation'
                ? t(`settings.${item}`)
                : integrationDefinitions[item].title[isRTL ? 1 : 0]}
            </button>
          ))}
        </div>
        <div className="min-w-0 space-y-3">
          {feedback && (
            <p role="alert" className="text-sm text-gray-700 dark:text-gray-300">
              {message}
            </p>
          )}
          {!data &&
            (feedback ? (
              <Button
                onClick={() => {
                  setFeedback('');
                  setLoadVersion((value) => value + 1);
                }}
              >
                {t('common.retry')}
              </Button>
            ) : (
              <p role="status">{t('common.loading')}</p>
            ))}
          {data && (
            <Card>
              <CardContent>
                <div
                  role="tabpanel"
                  id={`settings-panel-${tab}`}
                  aria-labelledby={`settings-tab-${tab}`}
                >
                  {integrationProviders.includes(tab as IntegrationProvider) && (
                    <IntegrationSettingsPanel key={tab} provider={tab as IntegrationProvider} />
                  )}
                  {tab === 'identity' && (
                    <form onSubmit={submit} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <Input
                          id="project-name"
                          label={t('settings.projectName')}
                          value={data.settings.projectName}
                          maxLength={100}
                          required
                          onChange={(event) => update('projectName', event.target.value)}
                        />
                        <Input
                          id="primary-color"
                          label={t('settings.primaryColor')}
                          type="color"
                          value={data.settings.primaryColor}
                          onChange={(event) => update('primaryColor', event.target.value)}
                        />
                        <BrandAssetField
                          kind="logo"
                          label={t('settings.logoUrl')}
                          value={data.settings.logoUrl}
                          disabled={saving}
                          onChange={(value) => update('logoUrl', value)}
                          onBusy={(active) => setUploading((count) => count + (active ? 1 : -1))}
                        />
                        <BrandAssetField
                          kind="favicon"
                          label={t('settings.faviconUrl')}
                          value={data.settings.faviconUrl}
                          disabled={saving}
                          onChange={(value) => update('faviconUrl', value)}
                          onBusy={(active) => setUploading((count) => count + (active ? 1 : -1))}
                        />
                      </div>
                      <p className="description-sm">
                        {isRTL
                          ? 'ارفع ملفًا أو استخدم مسار أصل محلي، ثم احفظ لتطبيق الهوية.'
                          : 'Upload a file or use an existing local asset path, then save to apply it.'}
                      </p>
                      <Button type="submit" loading={saving} disabled={uploading > 0}>
                        {t('common.save')}
                      </Button>
                    </form>
                  )}
                  {tab === 'currency' && (
                    <div className="space-y-6">
                      <form onSubmit={submit} className="space-y-4">
                        <Select
                          id="base-currency"
                          label={t('settings.baseCurrency')}
                          value={data.settings.baseCurrency}
                          onChange={(event) => update('baseCurrency', event.target.value)}
                        >
                          {data.currencies.map((code) => (
                            <option key={code}>{code}</option>
                          ))}
                        </Select>
                        <Button type="submit" loading={saving}>
                          {t('common.save')}
                        </Button>
                      </form>
                      <h2 className="text-lg font-semibold">{t('settings.exchangeRates')}</h2>
                      {data.rates.length === 0 ? (
                        <p className="description-sm">
                          {isRTL
                            ? 'أضف سعر صرف لبدء التحويل.'
                            : 'Add an exchange rate to start converting.'}
                        </p>
                      ) : (
                        <div className="table-container">
                          <table className="table-premium">
                            <thead>
                              <tr>
                                <th>{t('settings.currencyPair')}</th>
                                <th>{t('settings.rate')}</th>
                                <th>{t('settings.rateSource')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.rates.map((rate) => (
                                <tr key={`${rate.baseCurrency}-${rate.quoteCurrency}`}>
                                  <td>
                                    <bdi>
                                      {rate.baseCurrency} / {rate.quoteCurrency}
                                    </bdi>
                                  </td>
                                  <td>
                                    <bdi>{rate.rate}</bdi>
                                  </td>
                                  <td>{rate.source}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {tab === 'currency' && <CurrencySettingsPanel data={data} onSaved={setData} />}
                  {tab === 'activation' && <ActivationPanel />}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
