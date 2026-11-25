import { Alert, Button, Snackbar, Stack } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiRequestError } from '@/shared/api/api-request-error';
import type { JobOfferStatus, TransitionAction } from '@/shared/api/enums';
import { isOneOf } from '@/shared/is-one-of';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

import { useTransitionJobOffer } from './api/use-job-offer-mutations';
import type { Transition } from './job-offer-types';
import { ReasonDialog } from './reason-dialog';

/** Actions that step back or end the offer's life: they ask before running. */
const CONFIRMED_ACTIONS = ['withdraw', 'close'] as const satisfies TransitionAction[];
const BACKWARD_ACTIONS: TransitionAction[] = ['reject', 'withdraw', 'close'];
const KNOWN_ERROR_CODES = ['INVALID_TRANSITION', 'INVALID_STATE', 'INCOMPLETE_OFFER'] as const;

interface Notice {
  severity: 'success' | 'error';
  message: string;
}

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
  const transition = useTransitionJobOffer(jobOfferId);
  const [selected, setSelected] = useState<Transition>();
  const [notice, setNotice] = useState<Notice>();

  function label({ action, targetStatus }: Transition) {
    // A label depends on the target too: `submit` to TO_APPROVE is not `submit` to PUBLISHED.
    const labels: Partial<Record<JobOfferStatus, string>> = t(`transitions.${action}`, {
      returnObjects: true,
    });

    return labels[targetStatus] ?? t(`status.${targetStatus}`);
  }

  function errorMessage(error: Error) {
    const code = error instanceof ApiRequestError ? error.code : undefined;

    return isOneOf(KNOWN_ERROR_CODES, code) ? t(`errors.${code}`) : t('errors.generic');
  }

  function run({ action, targetStatus }: Transition, reason?: string) {
    transition.mutate(
      { action, reason },
      {
        onSuccess: () =>
          setNotice({
            severity: 'success',
            message: t('transitions.done', { status: t(`status.${targetStatus}`) }),
          }),
        onError: (error) => setNotice({ severity: 'error', message: errorMessage(error) }),
        onSettled: () => setSelected(undefined),
      },
    );
  }

  function choose(candidate: Transition) {
    if (candidate.requiresReason || isOneOf(CONFIRMED_ACTIONS, candidate.action)) {
      setSelected(candidate);
      return;
    }

    run(candidate);
  }

  const blockedByIncompleteness =
    !isComplete && transitions.some((candidate) => candidate.action === 'finalize');
  const confirmation =
    selected && isOneOf(CONFIRMED_ACTIONS, selected.action) ? selected.action : undefined;
  const selectedLabel = selected ? label(selected) : '';

  return (
    <Stack spacing={2}>
      {blockedByIncompleteness && <Alert severity="info">{t('job-offer.incomplete')}</Alert>}
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
      {selected?.requiresReason && (
        <ReasonDialog
          confirmLabel={selectedLabel}
          isPending={transition.isPending}
          onClose={() => setSelected(undefined)}
          onConfirm={(reason) => run(selected, reason)}
          title={t('transitions.confirm.title', { action: selectedLabel })}
        />
      )}
      <ConfirmDialog
        confirmLabel={selectedLabel}
        isPending={transition.isPending}
        onClose={() => setSelected(undefined)}
        onConfirm={() => selected && run(selected)}
        open={confirmation !== undefined}
        title={t('transitions.confirm.title', { action: selectedLabel })}
      >
        {confirmation && t(`transitions.confirm.${confirmation}`)}
      </ConfirmDialog>
      <Snackbar
        autoHideDuration={5000}
        onClose={() => setNotice(undefined)}
        open={notice !== undefined}
      >
        <Alert onClose={() => setNotice(undefined)} severity={notice?.severity} variant="filled">
          {notice?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
