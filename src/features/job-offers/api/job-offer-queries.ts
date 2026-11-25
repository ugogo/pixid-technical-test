import { keepPreviousData } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';

import type { JobOfferListQuery } from '../job-offer-types';

const byId = (jobOfferId: string) => ({ params: { path: { jobOfferId } } });

/** The offers' reads, as options a screen passes to `useQuery`; their keys are what writes refresh. */
export const jobOfferQueries = {
  /** The key every list shares, whatever its query: `['get', '/job-offers']`. */
  lists: () => $api.queryOptions('get', '/job-offers').queryKey,
  // The previous page stays on screen while the next one loads.
  list: (query: JobOfferListQuery) =>
    $api.queryOptions(
      'get',
      '/job-offers',
      { params: { query } },
      { placeholderData: keepPreviousData },
    ),
  detail: (jobOfferId: string) =>
    $api.queryOptions('get', '/job-offers/{jobOfferId}', byId(jobOfferId)),
  transitions: (jobOfferId: string) =>
    $api.queryOptions('get', '/job-offers/{jobOfferId}/transitions', byId(jobOfferId)),
  history: (jobOfferId: string) =>
    $api.queryOptions('get', '/job-offers/{jobOfferId}/history', byId(jobOfferId)),
};
