import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ensureOk, unwrap } from '@/shared/api/api-request-error';
import { apiClient } from '@/shared/api/client';
import type { TransitionAction } from '@/shared/api/enums';

import { jobOfferKeys } from './job-offer-keys';

interface TransitionVariables {
  action: TransitionAction;
  reason?: string;
}

/** Moves an offer along its workflow; buttons stay disabled until the next transitions arrive. */
export function useTransitionJobOffer(jobOfferId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, reason }: TransitionVariables) =>
      unwrap(
        apiClient.POST('/job-offers/{jobOfferId}/transitions/{action}', {
          params: { path: { jobOfferId, action } },
          body: reason ? { reason } : {},
        }),
      ),
    // The answer is the updated offer: keep it, and refetch only what it does not carry.
    onSuccess: (offer) => {
      queryClient.setQueryData(jobOfferKeys.detail(jobOfferId), offer);

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: jobOfferKeys.transitions(jobOfferId) }),
        queryClient.invalidateQueries({ queryKey: jobOfferKeys.history(jobOfferId) }),
        queryClient.invalidateQueries({ queryKey: jobOfferKeys.lists() }),
      ]);
    },
  });
}

/** Deletes a draft; its cached detail is dropped rather than refetched into a 404. */
export function useDeleteJobOffer(jobOfferId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      ensureOk(apiClient.DELETE('/job-offers/{jobOfferId}', { params: { path: { jobOfferId } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: jobOfferKeys.detail(jobOfferId) });

      return queryClient.invalidateQueries({ queryKey: jobOfferKeys.lists() });
    },
  });
}
