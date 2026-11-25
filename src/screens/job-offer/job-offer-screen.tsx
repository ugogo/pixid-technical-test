import { Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  DeleteJobOfferButton,
  isEditable,
  JobOfferDetails,
  JobOfferHistory,
  jobOfferQueries,
  StatusChip,
  TransitionActions,
} from '@/features/job-offers';
import { RouterButton, RouterLink } from '@/shared/ui/router-link';

const route = getRouteApi('/job-offers/$jobOfferId');

/** One offer: what it says, what can happen to it next, and what happened to it so far. */
export function JobOfferScreen() {
  const { t } = useTranslation();
  const { jobOfferId } = route.useParams();
  const { data: offer } = useQuery(jobOfferQueries.detail(jobOfferId));
  const { data: transitions } = useQuery(jobOfferQueries.transitions(jobOfferId));
  const { data: history } = useQuery(jobOfferQueries.history(jobOfferId));

  return (
    <Stack spacing={3}>
      <RouterLink to="/job-offers" underline="hover">
        {t('app.back-to-list')}
      </RouterLink>
      {offer ? (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography component="h1" variant="h4">
            {offer.title}
          </Typography>
          <StatusChip status={offer.status} />
        </Stack>
      ) : (
        <Skeleton height={48} width="50%" />
      )}
      {offer && transitions ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TransitionActions
            isComplete={offer.isComplete ?? false}
            jobOfferId={jobOfferId}
            transitions={transitions.transitions}
          />
          {isEditable(offer) && (
            <RouterButton
              params={{ jobOfferId }}
              to="/job-offers/$jobOfferId/edit"
              variant="outlined"
            >
              {t('job-offer.edit')}
            </RouterButton>
          )}
          {offer.status === 'DRAFT' && <DeleteJobOfferButton jobOfferId={jobOfferId} />}
        </Stack>
      ) : (
        <Skeleton height={40} width={240} />
      )}
      {offer ? <JobOfferDetails offer={offer} /> : <Skeleton height={160} variant="rounded" />}
      {history ? (
        <JobOfferHistory entries={history} />
      ) : (
        <Skeleton height={120} variant="rounded" />
      )}
    </Stack>
  );
}
