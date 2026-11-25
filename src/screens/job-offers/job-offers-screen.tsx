import { Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  JobOfferFilters,
  jobOfferQueries,
  JobOfferTable,
  type JobOfferListSearch,
} from '@/features/job-offers';
import { RouterButton } from '@/shared/ui/router-link';

const route = getRouteApi('/job-offers/');

/** The offers of the company, filtered, sorted and paged from the URL. */
export function JobOffersScreen() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { data: jobOfferPage, isPlaceholderData } = useQuery(jobOfferQueries.list(search));
  const lastPage =
    jobOfferPage && !isPlaceholderData ? Math.max(jobOfferPage.totalPages - 1, 0) : undefined;

  // A page past the last one (an old link, or offers that left the filter) shows the last page.
  useEffect(() => {
    if (lastPage !== undefined && search.page > lastPage) {
      void navigate({ search: (previous) => ({ ...previous, page: lastPage }), replace: true });
    }
  }, [lastPage, navigate, search.page]);

  /** A change of filter, sort or size starts again from the first page; a page change says so. */
  function updateSearch(changes: Partial<JobOfferListSearch>) {
    void navigate({ search: (previous) => ({ ...previous, page: 0, ...changes }) });
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography component="h1" variant="h4">
          {t('job-offers.list.title')}
        </Typography>
        <RouterButton to="/job-offers/new" variant="contained">
          {t('job-offers.new')}
        </RouterButton>
      </Stack>
      <JobOfferFilters
        onChange={updateSearch}
        onReset={() => void navigate({ search: { sort: search.sort, size: search.size } })}
        values={search}
      />
      <JobOfferTable
        isUpdating={isPlaceholderData}
        onChange={updateSearch}
        page={jobOfferPage}
        search={search}
      />
    </Stack>
  );
}
