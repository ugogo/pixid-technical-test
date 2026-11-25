import { useQuery } from '@tanstack/react-query';

import { toJobOfferListQuery, type JobOfferListSearch } from '../job-offer-list-search';
import { jobOfferQueries } from './job-offer-queries';

/** A page of offers for a URL state. */
export function useJobOffers(search: JobOfferListSearch) {
  return useQuery(jobOfferQueries.list(toJobOfferListQuery(search)));
}
