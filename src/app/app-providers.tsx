import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Language } from '@/shared/i18n/i18n';

import { createAppTheme } from './theme';

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
}

/** The query cache and the MUI theme, localized to the current language. */
export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const { i18n } = useTranslation();
  const language = i18n.language as Language;
  const theme = useMemo(() => createAppTheme(language), [language]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
