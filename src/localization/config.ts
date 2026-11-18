export const SUPPORTED_LOCALES = ['en', 'ar'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type Direction = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_STORAGE_KEY = 'travneeds-locale';

export const LOCALE_META: Record<
  SupportedLocale,
  {
    label: string;
    direction: Direction;
    intlLocale: string;
  }
> = {
  en: {
    label: 'English',
    direction: 'ltr',
    intlLocale: 'en-US',
  },
  ar: {
    label: 'العربية',
    direction: 'rtl',
    intlLocale: 'ar-EG',
  },
};

export const isSupportedLocale = (value: string | null | undefined): value is SupportedLocale => {
  return value === 'en' || value === 'ar';
};

export const resolveLocale = (value: string | null | undefined): SupportedLocale => {
  if (isSupportedLocale(value)) {
    return value;
  }

  return DEFAULT_LOCALE;
};

export const getDirection = (locale: SupportedLocale): Direction => {
  return LOCALE_META[locale].direction;
};

export const getIntlLocale = (locale: SupportedLocale): string => {
  return LOCALE_META[locale].intlLocale;
};
