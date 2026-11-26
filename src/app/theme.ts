import { createTheme } from '@mui/material';
import { enUS, frFR } from '@mui/material/locale';

import type { Language } from '@/shared/i18n/i18n';

const MUI_LOCALES = { en: enUS, fr: frFR } as const;

export function createAppTheme(language: Language) {
  return createTheme(
    {
      // Darker than MUI's defaults where those miss WCAG AA's 4.5:1 contrast, for white text on
      // a status chip or for a link on the page background.
      palette: {
        background: { default: '#f6f7f9' },
        primary: { main: '#1565c0' },
        info: { main: '#01579b' },
        warning: { main: '#b45309' },
      },
      shape: { borderRadius: 8 },
    },
    MUI_LOCALES[language],
  );
}
