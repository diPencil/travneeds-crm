import { useEffect, useState, type FormEvent } from 'react';
import type { SettingsResponse } from '../../../shared/settings/settings.contracts';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../../lib/http/api';
import { useBranding } from './useBranding';
import { readSettings, saveSettings } from './settings.api';

const tabs = ['identity', 'currency', 'activation'] as const;
type SettingsTab = (typeof tabs)[number];

export function SettingsPage() {
  const { t, isRTL } = useLocale();
  const { user, csrfToken } = useAuth();
  const { updateBranding } = useBranding();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [tab, setTab] = useState<SettingsTab>('identity');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
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
    if (!data || !csrfToken) return;
    setSaving(true);
    setFeedback('');
    try {
      const settings = await saveSettings(data.settings, csrfToken);
      setData({ ...data, settings });
      updateBranding(settings);
      setFeedback('SAVED');
    } catch (failure) {
      setFeedback(failure instanceof ApiError ? failure.code : 'SERVER_ERROR');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof SettingsResponse['settings'], value: string) => {
    if (data) setData({ ...data, settings: { ...data.settings, [field]: value } });
  };
  const message =
    feedback === 'SAVED'
      ? t('settings.saved')
      : feedback === 'SETTINGS_CONFLICT'
        ? t('settings.conflict')
        : t('settings.failed');

  return (
    <div className="page-container">
      <PageHeader title={t('nav.settings')} description={t('workspace.settingsDescription')} />
      <div role="tablist" aria-label={t('nav.settings')} className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item}
            role="tab"
            id={`settings-tab-${item}`}
            aria-controls={`settings-panel-${item}`}
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const step = (event.key === 'ArrowRight' ? 1 : -1) * (isRTL ? -1 : 1);
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
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-500 ${tab === item ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          >
            {t(`settings.${item}`)}
          </button>
        ))}
      </div>
      {feedback && (
        <p role="status" className="text-sm text-gray-700 dark:text-gray-300">
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
                    <Input
                      id="logo-url"
                      label={t('settings.logoUrl')}
                      value={data.settings.logoUrl}
                      required
                      pattern="/[^/].*"
                      onChange={(event) => update('logoUrl', event.target.value)}
                    />
                    <Input
                      id="favicon-url"
                      label={t('settings.faviconUrl')}
                      value={data.settings.faviconUrl}
                      required
                      pattern="/[^/].*"
                      onChange={(event) => update('faviconUrl', event.target.value)}
                    />
                  </div>
                  <p className="description-sm">{t('settings.assetPaths')}</p>
                  <Button type="submit" loading={saving}>
                    {t('common.save')}
                  </Button>
                </form>
              )}
              {tab === 'currency' && (
                <div className="space-y-6">
                  <form onSubmit={submit} className="space-y-4">
                    <Input
                      id="base-currency"
                      label={t('settings.baseCurrency')}
                      value={data.settings.baseCurrency}
                      required
                      pattern="[A-Z]{3}"
                      maxLength={3}
                      onChange={(event) => update('baseCurrency', event.target.value.toUpperCase())}
                    />
                    <Button type="submit" loading={saving}>
                      {t('common.save')}
                    </Button>
                  </form>
                  <h2 className="text-lg font-semibold">{t('settings.exchangeRates')}</h2>
                  {data.rates.length === 0 ? (
                    <p className="description-sm">{t('settings.noRates')}</p>
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
              {tab === 'activation' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">{t('settings.activation')}</h2>
                  <p className="description-sm">{t('settings.activationDeferred')}</p>
                  <p>
                    {t('settings.licenseStatus')} — {t(`settings.license.${data.license.status}`)}
                  </p>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        disabled
                        checked={data.license.plan === 'monthly'}
                        readOnly
                      />
                      {t('settings.monthly')}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        disabled
                        checked={data.license.plan === 'annual'}
                        readOnly
                      />
                      {t('settings.annual')}
                    </label>
                  </div>
                  <Input
                    id="activation-serial"
                    label={t('settings.serial')}
                    type="password"
                    value=""
                    disabled
                    placeholder={t('settings.serialDeferred')}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
