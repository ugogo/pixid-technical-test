import { Alert, AlertTitle, Button } from '@mui/material';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiRequestError } from '@/shared/api/api-request-error';
import { RouterLink } from '@/shared/ui/router-link';

/**
 * Catches what a page throws. A 404 from the API is a missing page, not a failure to retry;
 * anything else gets a retry that runs the failed queries and the route again.
 */
export function RootError({ error }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  useEffect(() => queryErrorResetBoundary.reset(), [queryErrorResetBoundary]);

  if (error instanceof ApiRequestError && error.status === 404) {
    return (
      <Alert
        action={
          <RouterLink color="inherit" to="/job-offers">
            {t('app.back-to-list')}
          </RouterLink>
        }
        severity="info"
      >
        {t('app.not-found')}
      </Alert>
    );
  }

  return (
    <Alert
      action={
        <Button color="inherit" onClick={() => router.invalidate()} size="small">
          {t('app.error.retry')}
        </Button>
      }
      severity="error"
    >
      <AlertTitle>{t('app.error.title')}</AlertTitle>
    </Alert>
  );
}
