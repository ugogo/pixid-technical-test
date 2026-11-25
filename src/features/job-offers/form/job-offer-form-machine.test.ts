import { describe, expect, test, vi } from 'vitest';
import { createActor, fromPromise, waitFor } from 'xstate';

import {
  jobOfferFormMachine,
  type JobOfferFormStep,
  type SaveMode,
  type SaveOutcome,
} from './job-offer-form-machine';

interface Answers {
  isStepValid?: boolean;
  firstInvalidStep?: JobOfferFormStep;
  outcome?: SaveOutcome;
  canSaveEarly?: boolean;
}

/** Starts the machine with actors that answer as told, and records what they were asked. */
function startForm({
  isStepValid = true,
  firstInvalidStep,
  outcome = { type: 'saved', jobOfferId: 'offer-1' },
  canSaveEarly = false,
}: Answers = {}) {
  const validateForSave = vi.fn<(mode: SaveMode) => void>();
  const save = vi.fn<() => void>();
  const actor = createActor(
    jobOfferFormMachine.provide({
      actors: {
        validateStep: fromPromise(async () => isStepValid),
        validateForSave: fromPromise(async ({ input }) => {
          validateForSave(input.mode);
          return firstInvalidStep;
        }),
        save: fromPromise(async () => {
          save();
          return outcome;
        }),
      },
    }),
    { input: { canSaveEarly } },
  ).start();

  return { actor, validateForSave, save };
}

async function reachReview(actor: ReturnType<typeof startForm>['actor']) {
  actor.send({ type: 'NEXT' });
  await waitFor(actor, (snapshot) => snapshot.matches({ editing: { compensation: 'idle' } }));
  actor.send({ type: 'NEXT' });
  await waitFor(actor, (snapshot) => snapshot.matches({ editing: 'review' }));
}

describe('jobOfferFormMachine', () => {
  test('moves to the next step once the current one is valid, and back on BACK', async () => {
    const { actor } = startForm();

    await reachReview(actor);
    actor.send({ type: 'BACK' });
    expect(actor.getSnapshot().matches({ editing: 'compensation' })).toBe(true);
    actor.send({ type: 'BACK' });
    expect(actor.getSnapshot().matches({ editing: 'basicInfo' })).toBe(true);
  });

  test('stays on a step whose fields are invalid', async () => {
    const { actor } = startForm({ isStepValid: false });

    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches({ editing: { basicInfo: 'validating' } })).toBe(true);
    await waitFor(actor, (snapshot) => snapshot.matches({ editing: { basicInfo: 'idle' } }));
  });

  test('saves from the review under the complete rules, then is done', async () => {
    const { actor, validateForSave } = startForm();

    await reachReview(actor);
    actor.send({ type: 'SAVE' });
    await waitFor(actor, (snapshot) => snapshot.matches('saved'));

    expect(validateForSave).toHaveBeenCalledWith('complete');
    expect(actor.getSnapshot().context.savedJobOfferId).toBe('offer-1');
    expect(actor.getSnapshot().status).toBe('done');
  });

  test('saves early only when the company allows it, under the draft rules', async () => {
    const refused = startForm({ canSaveEarly: false });

    refused.actor.send({ type: 'SAVE_EARLY' });
    expect(refused.actor.getSnapshot().matches({ editing: 'basicInfo' })).toBe(true);

    const allowed = startForm({ canSaveEarly: true });

    allowed.actor.send({ type: 'SAVE_EARLY' });
    await waitFor(allowed.actor, (snapshot) => snapshot.matches('saved'));
    expect(allowed.validateForSave).toHaveBeenCalledWith('draft');
  });

  test('goes to the first step holding an invalid field instead of saving', async () => {
    const { actor, save } = startForm({ firstInvalidStep: 'basicInfo' });

    await reachReview(actor);
    actor.send({ type: 'SAVE' });
    await waitFor(actor, (snapshot) => snapshot.matches({ editing: 'basicInfo' }));
    expect(save).not.toHaveBeenCalled();
  });

  test.each([
    ['basicInfo', { editing: 'basicInfo' }],
    ['compensation', { editing: 'compensation' }],
  ] as const)('a server field error on %s lands on its step', async (step, state) => {
    const { actor } = startForm({ outcome: { type: 'invalid', step } });

    await reachReview(actor);
    actor.send({ type: 'SAVE' });

    await expect(waitFor(actor, (snapshot) => snapshot.matches(state))).resolves.toBeDefined();
  });

  test('a conflict ends the form', async () => {
    const { actor } = startForm({ outcome: { type: 'conflict' } });

    await reachReview(actor);
    actor.send({ type: 'SAVE' });
    await waitFor(actor, (snapshot) => snapshot.matches('conflict'));
    expect(actor.getSnapshot().status).toBe('done');
  });

  test('a failed save returns to the same step and says so, until the next try', async () => {
    const { actor } = startForm({ outcome: { type: 'failed' } });

    await reachReview(actor);
    actor.send({ type: 'SAVE' });
    await waitFor(actor, (snapshot) => snapshot.context.hasSaveFailed);
    expect(actor.getSnapshot().matches({ editing: 'review' })).toBe(true);

    actor.send({ type: 'SAVE' });
    expect(actor.getSnapshot().context.hasSaveFailed).toBe(false);
  });

  test('sends one request however many times SAVE is sent', async () => {
    const { actor, save } = startForm();

    await reachReview(actor);
    actor.send({ type: 'SAVE' });
    await waitFor(actor, (snapshot) => snapshot.matches('saving'));
    actor.send({ type: 'SAVE' });
    actor.send({ type: 'SAVE_EARLY' });
    await waitFor(actor, (snapshot) => snapshot.matches('saved'));
    expect(save).toHaveBeenCalledOnce();
  });
});
