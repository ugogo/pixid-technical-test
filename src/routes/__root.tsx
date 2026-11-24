import { Typography } from '@mui/material';
import { createRootRouteWithContext } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { RouterContext } from '@/app/router';

import { AppLayout } from '@/app/app-layout';
import { RootError } from '@/app/root-error';

function NotFound() {
  const { t } = useTranslation();

  return <Typography>{t('app.not-found')}</Typography>;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AppLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});
