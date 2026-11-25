import { useQueryClient } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';

import { jobOfferQueries } from './job-offer-queries';

/** Moves an offer along its workflow; buttons stay disabled until the next transitions arrive. */
export function useTransitionJobOffer(jobOfferId: string) {
  const queryClient = useQueryClient();

  return $api.useMutation('post', '/job-offers/{jobOfferId}/transitions/{action}', {
    // The answer is the updated offer: keep it, and refetch only what it does not carry.
    onSuccess: (offer) => {
      queryClient.setQueryData(jobOfferQueries.detail(jobOfferId).queryKey, offer);

      return Promise.all(
        [
          jobOfferQueries.transitions(jobOfferId).queryKey,
          jobOfferQueries.history(jobOfferId).queryKey,
          jobOfferQueries.lists(),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

/** Deletes a draft; its cached detail is dropped rather than refetched into a 404. */
export function useDeleteJobOffer(jobOfferId: string) {
  const queryClient = useQueryClient();

  return $api.useMutation('delete', '/job-offers/{jobOfferId}', {
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: jobOfferQueries.detail(jobOfferId).queryKey });

      return queryClient.invalidateQueries({ queryKey: jobOfferQueries.lists() });
    },
  });
}
