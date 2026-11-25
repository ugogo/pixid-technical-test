import { Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  companySettingsQueries,
  useSaveCompanyConfiguration,
  WorkflowSettingsForm,
} from '@/features/company-settings';

/** The company's workflow settings: which optional steps its new offers go through. */
export function CompanySettingsScreen() {
  const { t } = useTranslation();
  const { data: configuration } = useQuery(companySettingsQueries.configuration());
  const saveCompanyConfiguration = useSaveCompanyConfiguration();

  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h4">
        {t('settings.title')}
      </Typography>
      <Typography color="text.secondary">{t('settings.intro')}</Typography>
      {configuration ? (
        <WorkflowSettingsForm configuration={configuration} onSave={saveCompanyConfiguration} />
      ) : (
        <Skeleton height={320} variant="rounded" />
      )}
    </Stack>
  );
}
