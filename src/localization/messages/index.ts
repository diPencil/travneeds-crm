import { arMessages } from './ar';
import { enMessages, type TranslationKey } from './en';
import type { SupportedLocale } from '../config';

export { type TranslationKey } from './en';

export const messages: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: enMessages,
  ar: arMessages,
};
