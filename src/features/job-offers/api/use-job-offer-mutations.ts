import { useQueryClient } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';

import { jobOfferQueries } from './job-offer-queries';

/** Creates an offer; the answer goes straight into its detail, which the form opens next. */
export function useCreateJobOffer() {
  const queryClient = useQueryClient();

  return $api.useMutation('post', '/job-offers', {
    onSuccess: (offer) => {
      queryClient.setQueryData(jobOfferQueries.detail(offer.id).queryKey, offer);

      return queryClient.invalidateQueries({ queryKey: jobOfferQueries.listsKey() });
    },
  });
}

/**
 * Saves an offer's fields. Its transitions depend on its completeness, so the cached ones are
 * dropped: the detail loads them again instead of showing the old ones first. A refusal (a 409)
 * means the offer changed elsewhere, so its detail is refetched.
 */
export function useUpdateJobOffer() {
  const queryClient = useQueryClient();

  return $api.useMutation('put', '/job-offers/{jobOfferId}', {
    onSuccess: (offer) => {
      queryClient.setQueryData(jobOfferQueries.detail(offer.id).queryKey, offer);
      queryClient.removeQueries({ queryKey: jobOfferQueries.transitions(offer.id).queryKey });

      return queryClient.invalidateQueries({ queryKey: jobOfferQueries.listsKey() });
    },
    onError: (_error, { params: { path } }) =>
      queryClient.invalidateQueries({ queryKey: jobOfferQueries.detail(path.jobOfferId).queryKey }),
  });
}

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
        queryClient.invalidateQueries({ queryKey: jobOfferQueries.listsKey() }),
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

      return queryClient.invalidateQueries({ queryKey: jobOfferQueries.listsKey() });
    },
  });
}
