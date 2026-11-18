import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getDirection,
  isSupportedLocale,
  resolveLocale,
  type SupportedLocale,
} from './config';
import { messages, type TranslationKey } from './messages';
import { LocaleContext, type LocaleContextValue } from './LocaleContext';

const getInitialLocale = (): SupportedLocale => {
  if (typeof window !== 'undefined') {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(storedLocale)) {
      return storedLocale;
    }
  }

  if (typeof document !== 'undefined') {
    const htmlLocale = document.documentElement.lang?.split('-')[0];
    if (isSupportedLocale(htmlLocale)) {
      return htmlLocale;
    }
  }

  return DEFAULT_LOCALE;
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<SupportedLocale>(() => getInitialLocale());
  const direction = getDirection(locale);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    root.lang = resolveLocale(locale);
    root.dir = direction;
    root.classList.remove('locale-en', 'locale-ar', 'dir-ltr', 'dir-rtl');
    root.classList.add(`locale-${locale}`, `dir-${direction}`);
  }, [direction, locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const t = (key: TranslationKey) => messages[locale][key] ?? messages.en[key] ?? key;

    return {
      locale,
      direction,
      isRTL: direction === 'rtl',
      switchLocale: (newLocale: SupportedLocale) => {
        document.documentElement.classList.add('no-transitions');
        setLocale(newLocale);
        setTimeout(() => {
          document.documentElement.classList.remove('no-transitions');
        }, 100);
      },
      t,
      rootClassName: `locale-${locale} dir-${direction}`,
    };
  }, [direction, locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};
