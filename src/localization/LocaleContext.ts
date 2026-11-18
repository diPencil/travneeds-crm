import { createContext } from 'react';
import type { Direction, SupportedLocale } from './config';
import type { TranslationKey } from './messages';

export interface LocaleContextValue {
  locale: SupportedLocale;
  direction: Direction;
  isRTL: boolean;
  switchLocale: (locale: SupportedLocale) => void;
  t: (key: TranslationKey) => string;
  rootClassName: string;
}

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
