import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/shared/api/api-request-error';
import { apiClient } from '@/shared/api/client';

import { jobOfferKeys } from './job-offer-keys';

export function useJobOffer(jobOfferId: string) {
  return useQuery({
    queryKey: jobOfferKeys.detail(jobOfferId),
    queryFn: ({ signal }) =>
      unwrap(
        apiClient.GET('/job-offers/{jobOfferId}', { params: { path: { jobOfferId } }, signal }),
      ),
  });
}

export function useJobOfferTransitions(jobOfferId: string) {
  return useQuery({
    queryKey: jobOfferKeys.transitions(jobOfferId),
    queryFn: ({ signal }) =>
      unwrap(
        apiClient.GET('/job-offers/{jobOfferId}/transitions', {
          params: { path: { jobOfferId } },
          signal,
        }),
      ),
  });
}

export function useJobOfferHistory(jobOfferId: string) {
  return useQuery({
    queryKey: jobOfferKeys.history(jobOfferId),
    queryFn: ({ signal }) =>
      unwrap(
        apiClient.GET('/job-offers/{jobOfferId}/history', {
          params: { path: { jobOfferId } },
          signal,
        }),
      ),
  });
}
