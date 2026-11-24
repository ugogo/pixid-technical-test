import type { ErrorComponentProps } from '@tanstack/react-router';

import { Alert, AlertTitle, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** Catches what a page throws, with a retry. */
export function RootError({ reset }: ErrorComponentProps) {
  const { t } = useTranslation();

  return (
    <Alert
      action={
        <Button color="inherit" onClick={reset} size="small">
          {t('app.error.retry')}
        </Button>
      }
      severity="error"
    >
      <AlertTitle>{t('app.error.title')}</AlertTitle>
    </Alert>
  );
}
