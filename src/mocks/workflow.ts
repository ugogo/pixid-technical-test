import type { components } from '@/shared/api/schema';

import type { JobOfferStatus, TransitionAction } from '@/shared/api/enums';

type Schemas = components['schemas'];

export type Transition = Schemas['AvailableTransitions']['transitions'][number];
export type WorkflowConfiguration = Pick<
  Schemas['CompanyConfiguration'],
  'approvalRequired' | 'partialSaveEnabled' | 'manualPostingRequired'
>;

function transition(
  action: TransitionAction,
  targetStatus: JobOfferStatus,
  requiresReason = false,
): Transition {
  return { action, targetStatus, requiresReason };
}

/** Where an approved offer goes: it waits to be posted by hand, or it is published. */
function statusAfterApproval(workflow: WorkflowConfiguration): JobOfferStatus {
  return workflow.manualPostingRequired ? 'TO_POST' : 'PUBLISHED';
}

/** Where a complete offer goes once submitted: to approval, or straight past it. */
function statusAfterCompletion(workflow: WorkflowConfiguration): JobOfferStatus {
  return workflow.approvalRequired ? 'TO_APPROVE' : statusAfterApproval(workflow);
}

/**
 * The transitions an offer can take, from its status and the workflow it was created with.
 * An incomplete offer still lists `submit` or `finalize`: performing it answers `INCOMPLETE_OFFER`.
 */
export function availableTransitions(
  status: JobOfferStatus,
  workflow: WorkflowConfiguration,
  isComplete: boolean,
): Transition[] {
  const withdraw = transition('withdraw', 'DRAFT');

  switch (status) {
    case 'DRAFT': {
      const parksIncomplete = !isComplete && workflow.partialSaveEnabled;

      return [
        transition('submit', parksIncomplete ? 'TO_FINALIZE' : statusAfterCompletion(workflow)),
      ];
    }
    case 'TO_FINALIZE':
      return [transition('finalize', statusAfterCompletion(workflow)), withdraw];
    case 'TO_APPROVE':
      return [
        transition('approve', statusAfterApproval(workflow)),
        transition('reject', 'DRAFT', true),
        withdraw,
      ];
    case 'TO_POST':
      return [transition('post', 'PUBLISHED'), withdraw];
    case 'PUBLISHED':
      return [transition('close', 'CLOSED'), withdraw];
    case 'CLOSED':
      return [transition('reopen', 'PUBLISHED')];
  }
}
