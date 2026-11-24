import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { LANGUAGES } from './i18n';
import { useLanguage } from './use-language';

const LANGUAGE_NAMES = { en: 'English', fr: 'Français' } as const;

/** Switches the app's language; the choice is saved for the next visit. */
export function LanguageSelect() {
  const { i18n, t } = useTranslation();
  const language = useLanguage();

  return (
    <TextField
      label={t('app.language')}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      select
      size="small"
      value={language}
    >
      {LANGUAGES.map((option) => (
        <MenuItem key={option} lang={option} value={option}>
          {LANGUAGE_NAMES[option]}
        </MenuItem>
      ))}
    </TextField>
  );
}
