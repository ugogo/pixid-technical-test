import { Alert, AlertTitle, Button } from '@mui/material';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Catches what a page throws; its retry runs the failed queries and the route again. */
export function RootError() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  useEffect(() => queryErrorResetBoundary.reset(), [queryErrorResetBoundary]);

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
