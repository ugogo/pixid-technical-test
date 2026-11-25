import { Alert, Button, Snackbar, Stack } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessageKey } from '@/shared/api/api-request-error';
import type { JobOfferStatus, TransitionAction } from '@/shared/api/enums';
import { isOneOf } from '@/shared/is-one-of';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

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
 * A transition that needs a reason or a confirmation waits in `selected` until the user answers.
 */
export function TransitionActions({ jobOfferId, transitions, isComplete }: TransitionActionsProps) {
  const { t } = useTranslation();
  const transition = useTransitionJobOffer();
  const [selected, setSelected] = useState<Transition>();

  function label({ action, targetStatus }: Transition) {
    // A label depends on the target too: `submit` to TO_APPROVE is not `submit` to PUBLISHED.
    const labels: Partial<Record<JobOfferStatus, string>> = t(`transitions.${action}`, {
      returnObjects: true,
    });

    return labels[targetStatus] ?? t(`status.${targetStatus}`);
  }

  function run({ action }: Transition, reason?: string) {
    transition.mutate(
      { params: { path: { jobOfferId, action } }, body: reason ? { reason } : {} },
      { onSettled: () => setSelected(undefined) },
    );
  }

  function choose(candidate: Transition) {
    if (candidate.requiresReason || isOneOf(CONFIRMED_ACTIONS, candidate.action)) {
      setSelected(candidate);
      return;
    }

    run(candidate);
  }

  function dialog(chosen: Transition) {
    const props = {
      confirmLabel: label(chosen),
      isPending: transition.isPending,
      onClose: () => setSelected(undefined),
      title: t('transitions.confirm.title', { action: label(chosen) }),
    };

    if (chosen.requiresReason) {
      return <ReasonDialog {...props} onConfirm={(reason) => run(chosen, reason)} />;
    }

    return (
      <ConfirmDialog
        {...props}
        message={
          isOneOf(CONFIRMED_ACTIONS, chosen.action)
            ? t(`transitions.confirm.${chosen.action}`)
            : undefined
        }
        onConfirm={() => run(chosen)}
        open
      />
    );
  }

  return (
    <Stack spacing={2}>
      {!isComplete && transitions.some((candidate) => candidate.action === 'finalize') && (
        <Alert severity="info">{t('job-offer.incomplete')}</Alert>
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {transitions.map((candidate) => (
          <Button
            disabled={transition.isPending || (candidate.action === 'finalize' && !isComplete)}
            key={candidate.action}
            onClick={() => choose(candidate)}
            variant={BACKWARD_ACTIONS.includes(candidate.action) ? 'outlined' : 'contained'}
          >
            {label(candidate)}
          </Button>
        ))}
      </Stack>
      {selected && dialog(selected)}
      {/* The outcome of the last transition, read from the mutation itself. */}
      <Snackbar
        autoHideDuration={5000}
        onClose={() => transition.reset()}
        open={transition.isSuccess || transition.isError}
      >
        <Alert
          onClose={() => transition.reset()}
          severity={transition.isError ? 'error' : 'success'}
          variant="filled"
        >
          {transition.error && t(errorMessageKey(transition.error))}
          {transition.data &&
            t('transitions.done', { status: t(`status.${transition.data.status}`) })}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
