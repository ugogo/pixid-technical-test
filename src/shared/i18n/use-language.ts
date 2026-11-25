import { useTranslation } from 'react-i18next';

import { isOneOf } from '@/shared/is-one-of';

import { FALLBACK_LANGUAGE, LANGUAGES, type Language } from './i18n';

/** The language the app is displayed in, narrowed to the ones it ships. */
export function useLanguage(): Language {
  const { i18n } = useTranslation();

  return isOneOf(LANGUAGES, i18n.resolvedLanguage) ? i18n.resolvedLanguage : FALLBACK_LANGUAGE;
}
