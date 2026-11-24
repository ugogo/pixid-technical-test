import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** The company's job offers, filtered, sorted and paginated. */
export function JobOffersScreen() {
  const { t } = useTranslation();

  return (
    <Typography component="h1" variant="h4">
      {t('job-offers.list.title')}
    </Typography>
  );
}
