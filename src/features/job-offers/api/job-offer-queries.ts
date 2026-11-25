import { queryOptions } from '@tanstack/react-query';

import { unwrap } from '@/shared/api/api-request-error';
import { apiClient } from '@/shared/api/client';

import { jobOfferKeys } from './job-offer-keys';

/** One offer's reads, as options a screen passes to `useQuery`. */
export const jobOfferQueries = {
  detail: (jobOfferId: string) =>
    queryOptions({
      queryKey: jobOfferKeys.detail(jobOfferId),
      queryFn: ({ signal }) =>
        unwrap(
          apiClient.GET('/job-offers/{jobOfferId}', { params: { path: { jobOfferId } }, signal }),
        ),
    }),
  transitions: (jobOfferId: string) =>
    queryOptions({
      queryKey: jobOfferKeys.transitions(jobOfferId),
      queryFn: ({ signal }) =>
        unwrap(
          apiClient.GET('/job-offers/{jobOfferId}/transitions', {
            params: { path: { jobOfferId } },
            signal,
          }),
        ),
    }),
  history: (jobOfferId: string) =>
    queryOptions({
      queryKey: jobOfferKeys.history(jobOfferId),
      queryFn: ({ signal }) =>
        unwrap(
          apiClient.GET('/job-offers/{jobOfferId}/history', {
            params: { path: { jobOfferId } },
            signal,
          }),
        ),
    }),
};
