import { Alert, Button, Snackbar, Stack } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessageKey } from '@/shared/api/api-request-error';
import type { JobOfferStatus, TransitionAction } from '@/shared/api/enums';
import { isOneOf } from '@/shared/is-one-of';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { RouterLink } from '@/shared/ui/router-link';

import { useTransitionJobOffer } from './api/use-job-offer-mutations';
import type { Transition } from './job-offer-types';
import { ReasonDialog } from './reason-dialog';

/** Actions that step back or end the offer's life ask before running. */
const CONFIRMED_ACTIONS = ['withdraw', 'close'] as const satisfies TransitionAction[];
const BACKWARD_ACTIONS: TransitionAction[] = [...CONFIRMED_ACTIONS, 'reject'];

interface TransitionActionsProps {
  jobOfferId: string;
  transitions: Transition[];
  isComplete: boolean;
}

/**
 * One button per transition the server offers; the UI never computes the workflow itself.
 * A transition that needs a reason or a confirmation waits in `transitionToConfirm` until the user answers.
 */
export function TransitionActions({ jobOfferId, transitions, isComplete }: TransitionActionsProps) {
  const { t } = useTranslation();
  const transitionJobOffer = useTransitionJobOffer();
  const [transitionToConfirm, setTransitionToConfirm] = useState<Transition>();

  function transitionLabel({ action, targetStatus }: Transition) {
    // A label depends on the target too: `submit` to TO_APPROVE is not `submit` to PUBLISHED.
    const labels: Partial<Record<JobOfferStatus, string>> = t(`transitions.${action}`, {
      returnObjects: true,
    });

    return labels[targetStatus] ?? t(`status.${targetStatus}`);
  }

  function submitTransition({ action }: Transition, reason?: string) {
    transitionJobOffer.mutate(
      { params: { path: { jobOfferId, action } }, body: reason ? { reason } : {} },
      { onSettled: () => setTransitionToConfirm(undefined) },
    );
  }

  function handleTransitionClick(transition: Transition) {
    if (transition.requiresReason || isOneOf(CONFIRMED_ACTIONS, transition.action)) {
      setTransitionToConfirm(transition);
      return;
    }

    submitTransition(transition);
  }

  function confirmationDialog(transition: Transition) {
    const dialogProps = {
      confirmLabel: transitionLabel(transition),
      isPending: transitionJobOffer.isPending,
      onClose: () => setTransitionToConfirm(undefined),
      title: t('transitions.confirm.title', { action: transitionLabel(transition) }),
    };

    if (transition.requiresReason) {
      return (
        <ReasonDialog
          {...dialogProps}
          onConfirm={(reason) => submitTransition(transition, reason)}
        />
      );
    }

    return (
      <ConfirmDialog
        {...dialogProps}
        message={
          isOneOf(CONFIRMED_ACTIONS, transition.action)
            ? t(`transitions.confirm.${transition.action}`)
            : undefined
        }
        onConfirm={() => submitTransition(transition)}
        open
      />
    );
  }

  return (
    <Stack spacing={2}>
      {!isComplete && transitions.some((transition) => transition.action === 'finalize') && (
        <Alert
          action={
            <RouterLink params={{ jobOfferId }} to="/job-offers/$jobOfferId/edit">
              {t('job-offer.incomplete-edit')}
            </RouterLink>
          }
          severity="info"
        >
          {t('job-offer.incomplete')}
        </Alert>
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {transitions.map((transition) => (
          <Button
            disabled={
              transitionJobOffer.isPending || (transition.action === 'finalize' && !isComplete)
            }
            key={transition.action}
            onClick={() => handleTransitionClick(transition)}
            variant={BACKWARD_ACTIONS.includes(transition.action) ? 'outlined' : 'contained'}
          >
            {transitionLabel(transition)}
          </Button>
        ))}
      </Stack>
      {transitionToConfirm && confirmationDialog(transitionToConfirm)}
      {/* The outcome of the last transition, read from the mutation itself. */}
      <Snackbar
        autoHideDuration={5000}
        onClose={() => transitionJobOffer.reset()}
        open={transitionJobOffer.isSuccess || transitionJobOffer.isError}
      >
        <Alert
          onClose={() => transitionJobOffer.reset()}
          severity={transitionJobOffer.isError ? 'error' : 'success'}
          variant="filled"
        >
          {transitionJobOffer.error && t(errorMessageKey(transitionJobOffer.error))}
          {transitionJobOffer.data &&
            t('transitions.done', { status: t(`status.${transitionJobOffer.data.status}`) })}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
