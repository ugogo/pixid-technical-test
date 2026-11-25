import { AppBar, Box, Container, Stack, Toolbar, Typography } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { LanguageSelect } from '@/shared/i18n/language-select';
import { RouterButton } from '@/shared/ui/router-link';

/** The app bar and the page below it. */
export function AppLayout() {
  const { t } = useTranslation();

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        color="inherit"
        elevation={0}
        position="static"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography component="p" sx={{ flexGrow: 1, fontWeight: 600 }} variant="h6">
            {t('app.title')}
          </Typography>
          <Stack component="nav" direction="row" spacing={1}>
            <RouterButton to="/job-offers">{t('app.navigation.job-offers')}</RouterButton>
          </Stack>
          <LanguageSelect />
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
