import { createTheme } from '@mui/material';
import { enUS, frFR } from '@mui/material/locale';

import type { Language } from '@/shared/i18n/i18n';

const MUI_LOCALES = { en: enUS, fr: frFR } as const;

export function createAppTheme(language: Language) {
  return createTheme(
    {
      palette: { background: { default: '#f6f7f9' } },
      shape: { borderRadius: 8 },
    },
    MUI_LOCALES[language],
  );
}
