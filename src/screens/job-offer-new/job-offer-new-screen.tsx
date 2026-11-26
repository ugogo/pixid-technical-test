import { Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { companySettingsQueries } from '@/features/company-settings';
import { JobOfferForm, useCreateJobOffer } from '@/features/job-offers';
import { RouterLink } from '@/shared/ui/router-link';

/** A new offer; whether it can be saved before its compensation is the company's setting. */
export function JobOfferNewScreen() {
  const { t } = useTranslation();
  const { data: configuration } = useQuery(companySettingsQueries.configuration());
  const createJobOffer = useCreateJobOffer();

  return (
    <Stack spacing={3}>
      <RouterLink to="/job-offers" underline="hover">
        {t('app.back-to-list')}
      </RouterLink>
      <Typography component="h1" variant="h4">
        {t('job-offers.new')}
      </Typography>
      {configuration ? (
        <JobOfferForm
          canSaveEarly={configuration.partialSaveEnabled}
          onSave={(body, callbacks) => createJobOffer.mutate({ body }, callbacks)}
        />
      ) : (
        <Skeleton height={360} variant="rounded" />
      )}
    </Stack>
  );
}
