import { keepPreviousData } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';

import { toJobOfferListQuery, type JobOfferListSearch } from '../job-offer-list-search';

const jobOfferPathParams = (jobOfferId: string) => ({ params: { path: { jobOfferId } } });

/** The offers' reads, as options a screen passes to `useQuery`; their keys are what writes refresh. */
export const jobOfferQueries = {
  /** The key every list shares: openapi-react-query appends each list's request to `[method, path]`. */
  listsKey: () => $api.queryOptions('get', '/job-offers').queryKey,
  // The previous page stays on screen while the next one loads.
  list: (search: JobOfferListSearch) =>
    $api.queryOptions(
      'get',
      '/job-offers',
      { params: { query: toJobOfferListQuery(search) } },
      { placeholderData: keepPreviousData },
    ),
  detail: (jobOfferId: string) =>
    $api.queryOptions('get', '/job-offers/{jobOfferId}', jobOfferPathParams(jobOfferId)),
  transitions: (jobOfferId: string) =>
    $api.queryOptions(
      'get',
      '/job-offers/{jobOfferId}/transitions',
      jobOfferPathParams(jobOfferId),
    ),
  history: (jobOfferId: string) =>
    $api.queryOptions('get', '/job-offers/{jobOfferId}/history', jobOfferPathParams(jobOfferId)),
};
