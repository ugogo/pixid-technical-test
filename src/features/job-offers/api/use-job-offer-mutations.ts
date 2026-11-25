import { useQueryClient } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';

import { jobOfferQueries } from './job-offer-queries';

/** Moves an offer along its workflow; buttons stay disabled until the next transitions arrive. */
export function useTransitionJobOffer() {
  const queryClient = useQueryClient();

  return $api.useMutation('post', '/job-offers/{jobOfferId}/transitions/{action}', {
    // The answer is the updated offer: keep it, and refetch only what it does not carry.
    onSuccess: (offer, { params: { path } }) => {
      queryClient.setQueryData(jobOfferQueries.detail(path.jobOfferId).queryKey, offer);

      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: jobOfferQueries.transitions(path.jobOfferId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: jobOfferQueries.history(path.jobOfferId).queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: jobOfferQueries.lists() }),
      ]);
    },
  });
}

/** Deletes a draft; its cached detail is dropped rather than refetched into a 404. */
export function useDeleteJobOffer() {
  const queryClient = useQueryClient();

  return $api.useMutation('delete', '/job-offers/{jobOfferId}', {
    onSuccess: (_data, { params: { path } }) => {
      queryClient.removeQueries({ queryKey: jobOfferQueries.detail(path.jobOfferId).queryKey });

      return queryClient.invalidateQueries({ queryKey: jobOfferQueries.lists() });
    },
  });
}
