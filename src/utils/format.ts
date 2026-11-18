import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getIntlLocale,
  isSupportedLocale,
  resolveLocale as resolveSupportedLocale,
  type SupportedLocale,
} from '../localization/config';

type FormatOptions = {
  locale?: SupportedLocale;
};

type CurrencyFormatOptions = FormatOptions & {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type NumberFormatOptions = FormatOptions & {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
};

const getActiveLocale = (): SupportedLocale => {
  if (typeof document !== 'undefined') {
    const htmlLocale = document.documentElement.lang?.split('-')[0];
    if (isSupportedLocale(htmlLocale)) {
      return htmlLocale;
    }
  }

  if (typeof window !== 'undefined') {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(storedLocale)) {
      return storedLocale;
    }
  }

  return DEFAULT_LOCALE;
};

export const resolveLocale = (locale?: SupportedLocale): SupportedLocale => {
  return resolveSupportedLocale(locale ?? getActiveLocale());
};

const getIntlLocaleForActiveLocale = (locale?: SupportedLocale) => {
  return getIntlLocale(resolveLocale(locale));
};

export const formatCurrency = (amount: number, options: CurrencyFormatOptions = {}) => {
  const { locale, currency = 'USD', minimumFractionDigits, maximumFractionDigits } = options;

  const resolved = resolveLocale(locale);

  return new Intl.NumberFormat(getIntlLocale(resolved), {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
};

export const formatDate = (date: string | null | undefined, options: FormatOptions = {}) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(
      /^\d{4}-\d{2}-\d{2} \d{2}:/.test(date) ? date.replace(' ', 'T') + 'Z' : date,
    );
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat(getIntlLocaleForActiveLocale(options.locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return 'N/A';
  }
};

export const formatDateTime = (date: string | null | undefined, options: FormatOptions = {}) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(
      /^\d{4}-\d{2}-\d{2} \d{2}:/.test(date) ? date.replace(' ', 'T') + 'Z' : date,
    );
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat(getIntlLocaleForActiveLocale(options.locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return 'N/A';
  }
};

export const formatNumber = (value: number, options: NumberFormatOptions = {}) => {
  return new Intl.NumberFormat(getIntlLocaleForActiveLocale(options.locale), {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    signDisplay: options.signDisplay,
  }).format(value);
};

export const formatPercent = (value: number, options: NumberFormatOptions = {}) => {
  return new Intl.NumberFormat(getIntlLocaleForActiveLocale(options.locale), {
    style: 'percent',
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    signDisplay: options.signDisplay,
  }).format(value);
};
