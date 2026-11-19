import { useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import type { CurrencyRate, SettingsResponse } from '../../../shared/settings/settings.contracts';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { apiRequest, ApiError } from '../../lib/http/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';

export function CurrencySettingsPanel({
  data,
  onSaved,
}: {
  data: SettingsResponse;
  onSaved: (data: SettingsResponse) => void;
}) {
  const { csrfToken } = useAuth();
  const { isRTL, t } = useLocale();
  const toast = useToastContext();
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState('');
  const names = new Intl.DisplayNames([isRTL ? 'ar' : 'en'], { type: 'currency' });
  const available = data.supportedCurrencies.filter((code) => !data.currencies.includes(code));
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({
    baseCurrency: data.settings.baseCurrency,
    quoteCurrency: '',
    rate: '',
    effectiveAt: new Date().toISOString().slice(0, 16),
    source: '',
    version: 0,
  });
  const [conversion, setConversion] = useState({
    baseCurrency: data.settings.baseCurrency,
    quoteCurrency: '',
    amount: '',
  });
  const [result, setResult] = useState<string | null>(null);
  const existing = data.rates.find(
    (rate) => rate.baseCurrency === form.baseCurrency && rate.quoteCurrency === form.quoteCurrency,
  );
  function loadRate(rate: CurrencyRate) {
    setForm({ ...rate, effectiveAt: rate.effectiveAt.replace(' ', 'T').slice(0, 23) });
    setFeedback('');
    const input = document.getElementById('rate-value');
    input?.scrollIntoView({ block: 'center' });
    input?.focus({ preventScroll: true });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || busy) return;
    setBusy(true);
    setFeedback('');
    try {
      const saved = await apiRequest<SettingsResponse>('/settings/currencies', {
        method: 'POST',
        csrfToken,
        body: { ...form, effectiveAt: new Date(form.effectiveAt + 'Z').toISOString() },
      });
      onSaved(saved);
      setForm((previous) => ({
        ...previous,
        version:
          saved.rates.find(
            (rate) =>
              rate.baseCurrency === form.baseCurrency && rate.quoteCurrency === form.quoteCurrency,
          )?.version ?? previous.version,
      }));
      toast.success(isRTL ? 'تم حفظ سعر الصرف.' : 'Exchange rate saved.');
    } catch (error) {
      setFeedback(
        error instanceof ApiError && error.code === 'SETTINGS_CONFLICT'
          ? isRTL
            ? 'سعر الصرف اتغير. حدّث الصفحة عشان تحمل أحدث نسخة قبل الحفظ.'
            : 'The rate changed. Refresh the page to load its latest version before saving.'
          : isRTL
            ? 'تعذّر حفظ سعر الصرف.'
            : 'Could not save the exchange rate.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function convert(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || busy) return;
    setBusy(true);
    setResult(null);
    setFeedback('');
    try {
      const value = await apiRequest<{ convertedAmount: string; quoteCurrency: string }>(
        '/settings/currencies/convert',
        { method: 'POST', csrfToken, body: conversion },
      );
      setResult(`${value.convertedAmount} ${value.quoteCurrency}`);
    } catch {
      setFeedback(
        isRTL
          ? 'لا يوجد سعر صرف ساري لهذا الاتجاه أو المبلغ غير صالح.'
          : 'No effective rate exists for this direction, or the amount is invalid.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function addCurrency(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || busy || !available.includes(newCode)) return;
    setBusy(true);
    setFeedback('');
    try {
      onSaved(
        await apiRequest<SettingsResponse>('/settings/currency-list', {
          method: 'POST',
          csrfToken,
          body: { code: newCode },
        }),
      );
      setNewCode('');
      toast.success(isRTL ? 'تمت إضافة العملة.' : 'Currency added.');
    } catch {
      setFeedback(isRTL ? 'تعذّر إضافة العملة.' : 'Could not add currency.');
    } finally {
      setBusy(false);
    }
  }
  const options = data.currencies.map((code) => (
    <option key={code} value={code}>
      {code} · {names.of(code)}
    </option>
  ));
  const currency = (key: 'baseCurrency' | 'quoteCurrency', label: string) => (
    <Select
      id={`rate-${key}`}
      label={label}
      value={form[key]}
      disabled={busy}
      required
      onChange={(event) =>
        setForm((previous) => ({ ...previous, [key]: event.target.value, version: 0 }))
      }
    >
      <option value="">{isRTL ? 'اختار عملة' : 'Choose currency'}</option>
      {options}
    </Select>
  );
  return (
    <div className="space-y-6">
      <h2 id="exchange-rates" className="text-lg font-semibold">
        {t('settings.exchangeRates')}
      </h2>
      {data.rates.length === 0 ? (
        <p className="description-sm">
          {isRTL ? 'أضف سعر صرف لبدء التحويل.' : 'Add an exchange rate to start converting.'}
        </p>
      ) : (
        <div className="table-container">
          <table className="table-premium" aria-labelledby="exchange-rates">
            <thead>
              <tr>
                <th scope="col">{t('settings.currencyPair')}</th>
                <th scope="col">{t('settings.rate')}</th>
                <th scope="col">{t('settings.rateSource')}</th>
                <th scope="col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.rates.map((rate) => {
                const pair = `${rate.baseCurrency} / ${rate.quoteCurrency}`;
                const editLabel = isRTL ? `تعديل سعر الصرف ${pair}` : `Edit exchange rate ${pair}`;
                return (
                  <tr key={pair}>
                    <td>
                      <bdi>{pair}</bdi>
                    </td>
                    <td>
                      <bdi>{rate.rate}</bdi>
                    </td>
                    <td>{rate.source}</td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-9 min-w-9"
                        aria-label={editLabel}
                        title={editLabel}
                        disabled={busy}
                        onClick={() => loadRate(rate)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <form
        onSubmit={(event) => void addCurrency(event)}
        className="space-y-3 border-t border-gray-100 pt-6 dark:border-gray-800"
      >
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
          <Select
            id="new-project-currency"
            label={isRTL ? 'إضافة عملة' : 'Add currency'}
            value={newCode}
            onChange={(event) => setNewCode(event.target.value)}
          >
            <option value="">
              {isRTL ? 'اختار من العملات المتاحة' : 'Choose from all available currencies'}
            </option>
            {available.map((code) => (
              <option key={code} value={code}>
                {code} · {names.of(code)}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={busy || !newCode}>
            {isRTL ? 'إضافة' : 'Add'}
          </Button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {data.currencies.map((code) => (
            <li
              key={code}
              className="rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-100"
            >
              <bdi>{code}</bdi> · {names.of(code)}
            </li>
          ))}
        </ul>
      </form>
      <h2 id="exchange-rate-editor" className="text-lg font-bold">
        {isRTL ? 'إضافة أو تعديل سعر صرف' : 'Add or edit an exchange rate'}
      </h2>
      <form
        onSubmit={(event) => void save(event)}
        className="space-y-4"
        aria-labelledby="exchange-rate-editor"
      >
        <div className="grid md:grid-cols-2 gap-4">
          {currency('baseCurrency', isRTL ? 'من عملة' : 'From currency')}
          {currency('quoteCurrency', isRTL ? 'إلى عملة' : 'To currency')}
          <Input
            id="rate-value"
            label={t('settings.rate')}
            value={form.rate}
            disabled={busy}
            inputMode="decimal"
            required
            onChange={(event) => setForm((previous) => ({ ...previous, rate: event.target.value }))}
          />
          <Input
            id="rate-effective"
            label={isRTL ? 'ساري من (UTC)' : 'Effective from (UTC)'}
            type="datetime-local"
            step="0.001"
            disabled={busy}
            required
            value={form.effectiveAt}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, effectiveAt: event.target.value }))
            }
          />
          <Input
            id="rate-source"
            label={t('settings.rateSource')}
            value={form.source}
            disabled={busy}
            maxLength={160}
            required
            onChange={(event) =>
              setForm((previous) => ({ ...previous, source: event.target.value }))
            }
          />
        </div>
        {existing && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => loadRate(existing)}
          >
            {isRTL ? 'تحميل سعر الصرف الحالي للتعديل' : 'Load current rate for editing'}
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {t('common.save')}
        </Button>
      </form>
      <h2 className="font-bold">{isRTL ? 'تحويل عملة' : 'Currency converter'}</h2>
      <form
        onSubmit={(event) => void convert(event)}
        className="grid md:grid-cols-4 gap-4 items-end"
      >
        {(['baseCurrency', 'quoteCurrency'] as const).map((key) => (
          <Select
            key={key}
            id={`convert-${key}`}
            label={
              key === 'baseCurrency'
                ? isRTL
                  ? 'من عملة'
                  : 'From currency'
                : isRTL
                  ? 'إلى عملة'
                  : 'To currency'
            }
            required
            value={conversion[key]}
            onChange={(event) => {
              setConversion((previous) => ({ ...previous, [key]: event.target.value }));
              setResult(null);
            }}
          >
            <option value="">{isRTL ? 'اختار عملة' : 'Choose currency'}</option>
            {options}
          </Select>
        ))}
        <Input
          id="convert-amount"
          label={isRTL ? 'المبلغ' : 'Amount'}
          inputMode="decimal"
          required
          value={conversion.amount}
          onChange={(event) => {
            setConversion((previous) => ({ ...previous, amount: event.target.value }));
            setResult(null);
          }}
        />
        <Button loading={busy} type="submit">
          {isRTL ? 'تحويل' : 'Convert'}
        </Button>
      </form>
      {result && (
        <p role="status" className="text-lg font-bold">
          <bdi>{result}</bdi>
        </p>
      )}
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
      <p className="text-xs text-gray-500">
        {isRTL
          ? 'كل اتجاه له سعر صرف صريح. التحويل لا يعدّل عملة أو مبالغ العمليات الأصلية.'
          : 'Each direction requires an explicit rate. Conversion does not change original transaction currencies or amounts.'}
      </p>
    </div>
  );
}
