import { Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  companySettingsQueries,
  useUpdateCompanyConfiguration,
  WorkflowSettingsForm,
} from '@/features/company-settings';
import { CURRENT_COMPANY_ID } from '@/shared/api/current-company';

/** The company's workflow settings: which optional steps its new offers go through. */
export function CompanySettingsScreen() {
  const { t } = useTranslation();
  const { data: configuration } = useQuery(companySettingsQueries.configuration());
  const updateCompanyConfiguration = useUpdateCompanyConfiguration();

  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h4">
        {t('settings.title')}
      </Typography>
      <Typography color="text.secondary">{t('settings.intro')}</Typography>
      {configuration ? (
        <WorkflowSettingsForm
          configuration={configuration}
          onSave={(body) =>
            updateCompanyConfiguration.mutateAsync({
              params: { path: { companyId: CURRENT_COMPANY_ID } },
              body,
            })
          }
        />
      ) : (
        <Skeleton height={320} variant="rounded" />
      )}
    </Stack>
  );
}
