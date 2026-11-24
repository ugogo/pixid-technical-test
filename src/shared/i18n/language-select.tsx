import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { LANGUAGES } from './i18n';

const LANGUAGE_NAMES = { en: 'English', fr: 'Français' } as const;

/** Switches the app's language; the choice is saved for the next visit. */
export function LanguageSelect() {
  const { i18n, t } = useTranslation();

  return (
    <TextField
      label={t('app.language')}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      select
      size="small"
      value={i18n.language}
    >
      {LANGUAGES.map((language) => (
        <MenuItem key={language} lang={language} value={language}>
          {LANGUAGE_NAMES[language]}
        </MenuItem>
      ))}
    </TextField>
  );
}
