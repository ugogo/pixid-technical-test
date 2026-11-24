import { useTranslation } from 'react-i18next';

import { FALLBACK_LANGUAGE, isLanguage, type Language } from './i18n';

/** The language the app is displayed in, narrowed to the ones it ships. */
export function useLanguage(): Language {
  const { i18n } = useTranslation();

  return isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : FALLBACK_LANGUAGE;
}
