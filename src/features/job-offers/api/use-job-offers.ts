import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { unwrap } from '@/shared/api/api-request-error';
import { apiClient } from '@/shared/api/client';

import { toJobOfferListQuery, type JobOfferListSearch } from '../job-offer-list-search';
import { jobOfferKeys } from './job-offer-keys';

/** A page of offers for a URL state; the previous page stays on screen while the next one loads. */
export function useJobOffers(search: JobOfferListSearch) {
  const query = toJobOfferListQuery(search);

  return useQuery({
    queryKey: jobOfferKeys.list(query),
    queryFn: ({ signal }) => unwrap(apiClient.GET('/job-offers', { params: { query }, signal })),
    placeholderData: keepPreviousData,
  });
}
