import { assign, fromPromise, setup, type DoneActorEvent } from 'xstate';

/** The steps that hold fields, in the order the form shows them; the review step holds none. */
export const JOB_OFFER_FORM_STEPS = ['basicInfo', 'compensation'] as const;
export type JobOfferFormStep = (typeof JOB_OFFER_FORM_STEPS)[number];

/** Every step on screen, in order. */
export const JOB_OFFER_FORM_SCREEN_STEPS = [...JOB_OFFER_FORM_STEPS, 'review'] as const;
/** The step on screen, kept while the form validates or saves. */
export type JobOfferFormScreenStep = (typeof JOB_OFFER_FORM_SCREEN_STEPS)[number];

/** Saving early skips only the rule that a complete offer needs a salary or a bonus. */
export type SaveMode = 'draft' | 'complete';

/** What a save came to, as the form reads the server's answer. */
export type SaveOutcome =
  | { type: 'saved'; jobOfferId: string }
  | { type: 'invalid'; step: JobOfferFormStep }
  | { type: 'conflict' }
  | { type: 'failed' };

interface JobOfferFormTypes {
  input: { canSaveEarly: boolean };
  context: {
    canSaveEarly: boolean;
    shownStep: JobOfferFormScreenStep;
    saveMode: SaveMode;
    hasSaveFailed: boolean;
    savedJobOfferId?: string;
  };
  events: { type: 'NEXT' } | { type: 'BACK' } | { type: 'SAVE' } | { type: 'SAVE_EARLY' };
}

// XState reads only the types of these values.
const types: JobOfferFormTypes = {
  input: { canSaveEarly: false },
  context: {
    canSaveEarly: false,
    shownStep: 'basicInfo',
    saveMode: 'complete',
    hasSaveFailed: false,
  },
  events: { type: 'NEXT' },
};

function notProvided(): never {
  throw new Error('JobOfferForm provides this actor');
}

/**
 * One transition per step, in step order, to the step an actor's output names: the user lands on
 * the first invalid step. Guard and target come from the same step, so they cannot drift apart.
 */
function toInvalidStep<Output>(invalidStepOf: (output: Output) => JobOfferFormStep | undefined) {
  return JOB_OFFER_FORM_STEPS.map((step) => ({
    guard: ({ event }: { event: DoneActorEvent<Output> }) => invalidStepOf(event.output) === step,
    target: `editing.${step}`,
  }));
}

/**
 * The form's flow: its steps, the validation between them, and the save. It knows neither
 * react-hook-form nor the API: `JobOfferForm` provides the three actors.
 */
export const jobOfferFormMachine = setup({
  types,
  actors: {
    /** Whether a step's fields are valid, so the form can move past it. */
    validateStep: fromPromise<boolean, { step: JobOfferFormStep }>(notProvided),
    /** The first step holding an invalid field under the given rules, if any. */
    validateForSave: fromPromise<JobOfferFormStep | undefined, { mode: SaveMode }>(notProvided),
    save: fromPromise<SaveOutcome>(notProvided),
  },
  guards: {
    canSaveEarly: ({ context }) => context.canSaveEarly,
  },
}).createMachine({
  id: 'jobOfferForm',
  context: ({ input }) => ({
    canSaveEarly: input.canSaveEarly,
    shownStep: 'basicInfo',
    saveMode: 'complete',
    hasSaveFailed: false,
  }),
  initial: 'editing',
  states: {
    editing: {
      initial: 'basicInfo',
      on: {
        SAVE_EARLY: {
          guard: 'canSaveEarly',
          target: 'validatingSave',
          actions: assign({ saveMode: 'draft' }),
        },
      },
      states: {
        basicInfo: {
          entry: assign({ shownStep: 'basicInfo' }),
          initial: 'idle',
          states: {
            idle: { on: { NEXT: 'validating' } },
            validating: {
              invoke: {
                src: 'validateStep',
                input: { step: 'basicInfo' },
                onDone: [
                  {
                    guard: ({ event }) => event.output,
                    target: '#jobOfferForm.editing.compensation',
                  },
                  { target: 'idle' },
                ],
                onError: 'idle',
              },
            },
          },
        },
        compensation: {
          entry: assign({ shownStep: 'compensation' }),
          initial: 'idle',
          on: { BACK: 'basicInfo' },
          states: {
            idle: { on: { NEXT: 'validating' } },
            validating: {
              invoke: {
                src: 'validateStep',
                input: { step: 'compensation' },
                onDone: [
                  { guard: ({ event }) => event.output, target: '#jobOfferForm.editing.review' },
                  { target: 'idle' },
                ],
                onError: 'idle',
              },
            },
          },
        },
        review: {
          entry: assign({ shownStep: 'review' }),
          on: {
            BACK: 'compensation',
            SAVE: {
              target: '#jobOfferForm.validatingSave',
              actions: assign({ saveMode: 'complete' }),
            },
          },
        },
        /** The step the user was on, to come back to when a save fails without a field error. */
        lastStep: { type: 'history' },
      },
    },
    validatingSave: {
      entry: assign({ hasSaveFailed: false }),
      invoke: {
        src: 'validateForSave',
        input: ({ context }) => ({ mode: context.saveMode }),
        onDone: [
          ...toInvalidStep((firstInvalidStep: JobOfferFormStep | undefined) => firstInvalidStep),
          { target: 'saving' },
        ],
        onError: 'editing.lastStep',
      },
    },
    // Accepts no event: a second click cannot send the request twice.
    saving: {
      invoke: {
        src: 'save',
        onDone: [
          {
            guard: ({ event }) => event.output.type === 'saved',
            target: 'saved',
            actions: assign({
              savedJobOfferId: ({ event }) =>
                event.output.type === 'saved' ? event.output.jobOfferId : undefined,
            }),
          },
          ...toInvalidStep((outcome: SaveOutcome) =>
            outcome.type === 'invalid' ? outcome.step : undefined,
          ),
          { guard: ({ event }) => event.output.type === 'conflict', target: 'conflict' },
          { target: 'editing.lastStep', actions: assign({ hasSaveFailed: true }) },
        ],
        onError: { target: 'editing.lastStep', actions: assign({ hasSaveFailed: true }) },
      },
    },
    saved: { type: 'final' },
    /** The offer can no longer be edited (a 409): the form takes no more input. */
    conflict: { type: 'final' },
  },
});
