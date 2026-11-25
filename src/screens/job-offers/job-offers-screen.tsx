import { Stack, Typography } from '@mui/material';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  JobOfferFilters,
  JobOfferTable,
  useJobOffers,
  type JobOfferListSearch,
} from '@/features/job-offers';

const route = getRouteApi('/job-offers/');

/** The offers of the company, filtered, sorted and paged from the URL. */
export function JobOffersScreen() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { data, isPlaceholderData } = useJobOffers(search);

  /** A change of filter, sort or size starts again from the first page; a page change says so. */
  function updateSearch(changes: Partial<JobOfferListSearch>) {
    void navigate({ search: (previous) => ({ ...previous, page: 0, ...changes }) });
  }

  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h4">
        {t('job-offers.list.title')}
      </Typography>
      <JobOfferFilters
        onChange={updateSearch}
        onReset={() => void navigate({ search: { sort: search.sort, size: search.size } })}
        values={search}
      />
      <JobOfferTable
        isUpdating={isPlaceholderData}
        onChange={updateSearch}
        page={data}
        search={search}
      />
    </Stack>
  );
}
