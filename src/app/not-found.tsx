import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/shared/ui/router-link';

/** A page that does not exist: an unknown URL, or an offer the API does not know. */
export function NotFound() {
  const { t } = useTranslation();

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
