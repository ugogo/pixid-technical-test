import { describe, expect, test } from 'vitest';

import { availableTransitions, type JobOfferStatus, type WorkflowConfiguration } from './workflow';

function workflow(flags: Partial<WorkflowConfiguration> = {}): WorkflowConfiguration {
  return {
    approvalRequired: false,
    partialSaveEnabled: false,
    manualPostingRequired: false,
    ...flags,
  };
}

function targets(status: JobOfferStatus, configuration: WorkflowConfiguration, isComplete = true) {
  return Object.fromEntries(
    availableTransitions(status, configuration, isComplete).map((transition) => [
      transition.action,
      transition.targetStatus,
    ]),
  );
}

describe('availableTransitions', () => {
  test.each([
    [{}, 'PUBLISHED'],
    [{ manualPostingRequired: true }, 'TO_POST'],
    [{ approvalRequired: true }, 'TO_APPROVE'],
    [{ approvalRequired: true, manualPostingRequired: true }, 'TO_APPROVE'],
  ])('a complete draft under %o is submitted to %s', (flags, target) => {
    expect(targets('DRAFT', workflow(flags))).toEqual({ submit: target });
  });

  test('an incomplete draft is submitted to TO_FINALIZE when partial save is on', () => {
    expect(targets('DRAFT', workflow({ partialSaveEnabled: true }), false)).toEqual({
      submit: 'TO_FINALIZE',
    });
    expect(targets('DRAFT', workflow(), false)).toEqual({ submit: 'PUBLISHED' });
  });

  test.each([
    [{}, 'PUBLISHED'],
    [{ manualPostingRequired: true }, 'TO_POST'],
  ])('approval under %o leads to %s', (flags, target) => {
    expect(targets('TO_APPROVE', workflow({ approvalRequired: true, ...flags }))).toEqual({
      approve: target,
      reject: 'DRAFT',
      withdraw: 'DRAFT',
    });
  });

  test('finalize follows the same path as submit', () => {
    expect(targets('TO_FINALIZE', workflow({ partialSaveEnabled: true }))).toEqual({
      finalize: 'PUBLISHED',
      withdraw: 'DRAFT',
    });
    expect(
      targets('TO_FINALIZE', workflow({ partialSaveEnabled: true, approvalRequired: true })),
    ).toEqual({ finalize: 'TO_APPROVE', withdraw: 'DRAFT' });
  });

  test('later states', () => {
    expect(targets('TO_POST', workflow())).toEqual({ post: 'PUBLISHED', withdraw: 'DRAFT' });
    expect(targets('PUBLISHED', workflow())).toEqual({ close: 'CLOSED', withdraw: 'DRAFT' });
    expect(targets('CLOSED', workflow())).toEqual({ reopen: 'PUBLISHED' });
  });

  test('only reject requires a reason', () => {
    const transitions = availableTransitions(
      'TO_APPROVE',
      workflow({ approvalRequired: true }),
      true,
    );

    expect(transitions.filter((transition) => transition.requiresReason)).toEqual([
      { action: 'reject', targetStatus: 'DRAFT', requiresReason: true },
    ]);
  });
});
