import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useLanguage } from '@/shared/i18n/use-language';

import { createAppTheme } from './theme';

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
}

/** The query cache and the MUI theme, localized to the current language. */
export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const language = useLanguage();
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
