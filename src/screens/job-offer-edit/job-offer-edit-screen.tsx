import { Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { JobOfferForm, jobOfferQueries, useUpdateJobOffer } from '@/features/job-offers';
import { RouterLink } from '@/shared/ui/router-link';

const route = getRouteApi('/job-offers/$jobOfferId_/edit');

/**
 * An offer's fields, which the route's loader has fetched. Saving early is always offered: the
 * offer's own workflow is not exposed, so the server's 422 says when compensation is needed.
 */
export function JobOfferEditScreen() {
  const { t } = useTranslation();
  const { jobOfferId } = route.useParams();
  const { data: offer } = useQuery(jobOfferQueries.detail(jobOfferId));
  const updateJobOffer = useUpdateJobOffer();

  return (
    <Stack spacing={3}>
      <RouterLink params={{ jobOfferId }} to="/job-offers/$jobOfferId" underline="hover">
        {t('job-offer-form.open-offer')}
      </RouterLink>
      {offer ? (
        <>
          <Typography component="h1" variant="h4">
            {t('job-offer.edit-title', { title: offer.title })}
          </Typography>
          <JobOfferForm
            canSaveEarly
            key={offer.id}
            offer={offer}
            onSave={(body, callbacks) =>
              updateJobOffer.mutate({ params: { path: { jobOfferId } }, body }, callbacks)
            }
          />
        </>
      ) : (
        <Skeleton height={360} variant="rounded" />
      )}
    </Stack>
  );
}
