import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Paper, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ApiRequestError } from '@/shared/api/api-request-error';
import { isOneOf } from '@/shared/is-one-of';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { RouterButton, RouterLink } from '@/shared/ui/router-link';

import { JobOfferDetails } from '../job-offer-details';
import type { JobOffer } from '../job-offer-types';
import { BasicInfoStep } from './basic-info-step';
import { CompensationStep } from './compensation-step';
import { useFormErrorText } from './form-text-field';
import {
  hasCompensation,
  jobOfferFormSchema,
  toFormField,
  toJobOfferFormValues,
  toJobOfferRequest,
  type JobOfferFormField,
  type JobOfferFormOutput,
  type JobOfferFormValues,
  type JobOfferRequest,
} from './job-offer-form-schema';

/** The steps that hold fields, in the order the form shows them; the review step holds none. */
const STEPS = ['basicInfo', 'compensation'] as const;
type JobOfferFormStep = (typeof STEPS)[number];

const SCREEN_STEPS = [...STEPS, 'review'] as const;
type JobOfferFormScreenStep = (typeof SCREEN_STEPS)[number];

const NEXT_STEP = {
  basicInfo: 'compensation',
  compensation: 'review',
} as const satisfies Record<JobOfferFormStep, JobOfferFormScreenStep>;

const PREVIOUS_STEP = {
  compensation: 'basicInfo',
  review: 'compensation',
} as const satisfies Record<Exclude<JobOfferFormScreenStep, 'basicInfo'>, JobOfferFormStep>;

/** Saving early skips only the rule that a complete offer needs a salary or a bonus. */
type SaveMode = 'draft' | 'complete';

/**
 * What the form is doing, or how its last save ended. A conflict (a 409) ends it: the offer can no
 * longer be edited.
 */
type FormPhase =
  | 'editing'
  | 'checkingStep'
  | 'checkingSave'
  | 'sending'
  | 'saveFailed'
  | 'conflict';

/** Why a save failed, as the form reads the server's answer. */
type SaveFailure =
  | { type: 'invalid'; step: JobOfferFormStep }
  | { type: 'conflict' }
  | { type: 'failed' };

const PHASE_AFTER_SAVE_FAILURE = {
  invalid: 'editing',
  conflict: 'conflict',
  failed: 'saveFailed',
} as const satisfies Record<SaveFailure['type'], FormPhase>;

/** The form's top-level fields, by the step that shows them. */
const STEP_FIELDS = {
  basicInfo: ['title', 'location'],
  compensation: ['compensation'],
} as const satisfies Record<JobOfferFormStep, readonly JobOfferFormField[]>;

/** The step that shows a server field, found by its top-level field; the first step otherwise. */
function stepOfServerField(serverField: string): JobOfferFormStep {
  const [topLevelField] = serverField.split(/[.[]/, 1);
  const step = STEPS.find((fieldStep) => isOneOf(STEP_FIELDS[fieldStep], topLevelField));

  return step ?? 'basicInfo';
}

/**
 * Puts a failed save's field errors on the form: on their fields, or, for a field the form does
 * not show, at the top of its step. Says why the save failed.
 */
function applySaveError(
  error: unknown,
  jobOfferForm: UseFormReturn<JobOfferFormValues, unknown, JobOfferFormOutput>,
): SaveFailure {
  if (!(error instanceof ApiRequestError)) return { type: 'failed' };
  if (error.status === 409) return { type: 'conflict' };
  if (error.status !== 422 || error.fieldErrors.length === 0) return { type: 'failed' };

  const values = jobOfferForm.getValues();
  const stepsWithErrors = error.fieldErrors.map(({ field, message }) => {
    const step = stepOfServerField(field);

    jobOfferForm.setError(toFormField(field, values) ?? `root.${step}`, {
      type: 'server',
      message,
    });

    return step;
  });

  const firstStepWithErrors = STEPS.find((step) => stepsWithErrors.includes(step));

  return { type: 'invalid', step: firstStepWithErrors ?? 'basicInfo' };
}

/** What the form does once the request is answered. */
export interface JobOfferSaveCallbacks {
  onSuccess: (saved: JobOffer) => void;
  onError: (error: unknown) => void;
}

interface JobOfferFormProps {
  /** The offer to edit; without one, the form creates an offer. */
  offer?: JobOffer;
  /** Whether the offer can be saved before its compensation is filled in. */
  canSaveEarly: boolean;
  /**
   * Sends the request through the page's mutation, with `callbacks` as `mutate`'s own: TanStack
   * Query skips them once the page has unmounted, so a user who left during the save stays there.
   */
  onSave: (request: JobOfferRequest, callbacks: JobOfferSaveCallbacks) => void;
}

/** Creates or edits an offer in three steps, then opens it. */
export function JobOfferForm({ offer, canSaveEarly, onSave }: JobOfferFormProps) {
  const { t } = useTranslation();
  const formErrorText = useFormErrorText();
  const navigate = useNavigate();
  const [shownStep, setShownStep] = useState<JobOfferFormScreenStep>('basicInfo');
  const [phase, setPhase] = useState<FormPhase>('editing');
  const isSaving = phase === 'checkingSave' || phase === 'sending';
  const isBusy = phase === 'checkingStep' || isSaving || phase === 'conflict';
  const jobOfferForm = useForm<JobOfferFormValues, unknown, JobOfferFormOutput>({
    defaultValues: toJobOfferFormValues(offer),
    // Every field is locked while the request runs, since a change then would not be the one sent,
    // and once a conflict ends the form.
    disabled: phase === 'sending' || phase === 'conflict',
    // Not `onTouched`: it validates a whole salary or bonus list when a row is added, new row included.
    mode: 'onBlur',
    resolver: zodResolver(jobOfferFormSchema),
  });
  const { clearErrors, formState, getValues, setError, trigger } = jobOfferForm;

  /**
   * Checks a step's fields. Leaving the compensation step also needs a salary or a bonus, unless
   * the offer is saved early.
   */
  async function isStepValid(step: JobOfferFormStep, mode: SaveMode = 'complete') {
    clearErrors(`root.${step}`);

    const areFieldsValid = await trigger(STEP_FIELDS[step], { shouldFocus: true });

    if (!areFieldsValid) return false;
    if (step === 'basicInfo' || mode === 'draft' || hasCompensation(getValues())) return true;

    setError('root.compensation', {
      type: 'required',
      message: canSaveEarly ? 'compensation-required-or-save-early' : 'compensation-required',
    });
    return false;
  }

  /** The first step holding an invalid field under the given rules, if any. */
  async function firstInvalidStep(mode: SaveMode): Promise<JobOfferFormStep | undefined> {
    clearErrors('root');

    const isBasicInfoValid = await isStepValid('basicInfo', mode);

    if (!isBasicInfoValid) return 'basicInfo';

    const isCompensationValid = await isStepValid('compensation', mode);

    return isCompensationValid ? undefined : 'compensation';
  }

  async function goPastStep(step: JobOfferFormStep) {
    setPhase('checkingStep');

    const isValid = await isStepValid(step);

    setPhase('editing');
    if (isValid) setShownStep(NEXT_STEP[step]);
  }

  async function saveJobOffer(mode: SaveMode) {
    setPhase('checkingSave');

    const invalidStep = await firstInvalidStep(mode);

    if (invalidStep) {
      setShownStep(invalidStep);
      setPhase('editing');
      return;
    }

    const request = toJobOfferRequest(jobOfferFormSchema.parse(getValues()));

    setPhase('sending');
    onSave(request, {
      // The saved form is still dirty: opening the saved offer skips the leave prompt. A new offer's
      // form leaves the history, so Back goes to the list; an edit stays, as the detail before it does.
      onSuccess: (saved) =>
        void navigate({
          to: '/job-offers/$jobOfferId',
          params: { jobOfferId: saved.id },
          replace: offer === undefined,
          ignoreBlocker: true,
        }),
      onError: (error) => {
        const failure = applySaveError(error, jobOfferForm);

        if (failure.type === 'invalid') setShownStep(failure.step);
        setPhase(PHASE_AFTER_SAVE_FAILURE[failure.type]);
      },
    });
  }

  // Read during render: react-hook-form tracks `isDirty` only once something reads it.
  const leaveBlocker = useBlocker({
    shouldBlockFn: () => true,
    disabled: !formState.isDirty,
    withResolver: true,
  });

  const submitLabelKey =
    shownStep !== 'review'
      ? 'job-offer-form.next'
      : offer
        ? 'job-offer-form.save'
        : 'job-offer-form.create';
  const stepError =
    shownStep === 'review' ? undefined : formState.errors.root?.[shownStep]?.message;

  return (
    <FormProvider {...jobOfferForm}>
      <Paper
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (shownStep === 'review') void saveJobOffer('complete');
          else void goPastStep(shownStep);
        }}
        sx={{ p: 3 }}
        variant="outlined"
      >
        <Stack spacing={3}>
          <Typography color="text.secondary" variant="body2">
            {t('job-offer-form.step-count', {
              number: SCREEN_STEPS.indexOf(shownStep) + 1,
              count: SCREEN_STEPS.length,
            })}
          </Typography>
          <Stepper activeStep={SCREEN_STEPS.indexOf(shownStep)} alternativeLabel>
            {SCREEN_STEPS.map((step) => (
              <Step key={step}>
                <StepLabel>{t(`job-offer-form.steps.${step}`)}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {phase === 'saveFailed' && (
            <Alert severity="error">{t('job-offer-form.save-failed')}</Alert>
          )}
          {phase === 'conflict' && (
            <Alert
              action={
                offer && (
                  <RouterLink params={{ jobOfferId: offer.id }} to="/job-offers/$jobOfferId">
                    {t('job-offer-form.open-offer')}
                  </RouterLink>
                )
              }
              severity="warning"
            >
              {t('job-offer-form.conflict')}
            </Alert>
          )}
          {stepError && <Alert severity="error">{formErrorText(stepError)}</Alert>}
          {shownStep === 'basicInfo' && <BasicInfoStep />}
          {shownStep === 'compensation' && <CompensationStep />}
          {shownStep === 'review' && <JobOfferReview values={getValues()} />}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {shownStep === 'basicInfo' &&
              (offer ? (
                <RouterButton
                  disabled={isBusy}
                  params={{ jobOfferId: offer.id }}
                  to="/job-offers/$jobOfferId"
                >
                  {t('app.cancel')}
                </RouterButton>
              ) : (
                <RouterButton disabled={isBusy} to="/job-offers">
                  {t('app.cancel')}
                </RouterButton>
              ))}
            {shownStep !== 'basicInfo' && (
              <Button disabled={isBusy} onClick={() => setShownStep(PREVIOUS_STEP[shownStep])}>
                {t('job-offer-form.back')}
              </Button>
            )}
            {canSaveEarly && shownStep !== 'review' && (
              <Button
                disabled={isBusy}
                loading={isSaving}
                onClick={() => void saveJobOffer('draft')}
                variant="outlined"
              >
                {t('job-offer-form.save-early')}
              </Button>
            )}
            <Button
              disabled={isBusy}
              loading={shownStep === 'review' && isSaving}
              type="submit"
              variant="contained"
            >
              {t(submitLabelKey)}
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <ConfirmDialog
        confirmLabel={t('job-offer-form.leave.confirm')}
        // While a save runs, leaving would not lose the changes: the user waits for it instead.
        isPending={isSaving}
        message={t('job-offer-form.leave.body')}
        onClose={() => leaveBlocker.reset?.()}
        onConfirm={() => leaveBlocker.proceed?.()}
        open={leaveBlocker.status === 'blocked'}
        title={t('job-offer-form.leave.title')}
      />
    </FormProvider>
  );
}

/** The offer as it will be saved: its title, then the same blocks as its detail page. */
function JobOfferReview({ values }: { values: JobOfferFormValues }) {
  const request = jobOfferFormSchema.safeParse(values).data;

  if (!request) return null;

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h5">
        {request.title}
      </Typography>
      <JobOfferDetails offer={toJobOfferRequest(request)} />
    </Stack>
  );
}
