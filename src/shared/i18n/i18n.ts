import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import fr from './fr.json';

export const LANGUAGES = ['en', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';

const LANGUAGE_STORAGE_KEY = 'language';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

export function isLanguage(value: string | null | undefined): value is Language {
  return LANGUAGES.some((language) => language === value);
}

function initialLanguage(): Language {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isLanguage(savedLanguage)) {
    return savedLanguage;
  }

  return navigator.language.startsWith('fr') ? 'fr' : FALLBACK_LANGUAGE;
}

i18n.on('languageChanged', (language) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
});

await i18n.use(initReactI18next).init({
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
  lng: initialLanguage(),
  resources: { en: { translation: en }, fr: { translation: fr } },
});

export { i18n };
