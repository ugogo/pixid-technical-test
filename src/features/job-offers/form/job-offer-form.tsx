import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Paper, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { Navigate, useBlocker } from '@tanstack/react-router';
import { useMachine } from '@xstate/react';
import { useState } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { fromPromise } from 'xstate';

import { ApiRequestError } from '@/shared/api/api-request-error';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { RouterLink } from '@/shared/ui/router-link';

import { JobOfferDetails } from '../job-offer-details';
import type { JobOffer } from '../job-offer-types';
import { BasicInfoStep } from './basic-info-step';
import { CompensationStep } from './compensation-step';
import { useFormErrorText } from './form-text-field';
import {
  JOB_OFFER_FORM_SCREEN_STEPS,
  JOB_OFFER_FORM_STEPS,
  jobOfferFormMachine,
  type JobOfferFormScreenStep,
  type JobOfferFormStep,
  type SaveOutcome,
} from './job-offer-form-machine';
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

type JobOfferForm = UseFormReturn<JobOfferFormValues, unknown, JobOfferFormOutput>;

/** The form's top-level fields, by the step that shows them. */
const STEP_FIELDS = {
  basicInfo: ['title', 'location'],
  compensation: ['compensation'],
} as const satisfies Record<JobOfferFormStep, readonly JobOfferFormField[]>;

/** The step that shows a server field, found by its top-level field; the first step otherwise. */
function stepOfServerField(serverField: string): JobOfferFormStep {
  const [topLevelField] = serverField.split(/[.[]/, 1);
  const step = JOB_OFFER_FORM_STEPS.find((candidate) =>
    STEP_FIELDS[candidate].some((field) => field === topLevelField),
  );

  return step ?? 'basicInfo';
}

/**
 * Puts a failed save's field errors on the form: on their fields, or, for a field the form does
 * not show, at the top of its step. Says where the form goes next.
 */
function applySaveError(error: unknown, jobOfferForm: JobOfferForm): SaveOutcome {
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

  return {
    type: 'invalid',
    step: stepsWithErrors.includes('basicInfo') ? 'basicInfo' : 'compensation',
  };
}

interface JobOfferFormProps {
  /** The offer to edit; without one, the form creates an offer. */
  offer?: JobOffer;
  /** Whether the offer can be saved before its compensation is filled in. */
  canSaveEarly: boolean;
  /** Sends the request and resolves with the saved offer. Read once, when the form mounts. */
  onSave: (request: JobOfferRequest) => Promise<JobOffer>;
}

/** Creates or edits an offer in three steps, then opens it. */
export function JobOfferForm({ offer, canSaveEarly, onSave }: JobOfferFormProps) {
  const { t } = useTranslation();
  const formErrorText = useFormErrorText();
  const jobOfferForm = useForm<JobOfferFormValues, unknown, JobOfferFormOutput>({
    defaultValues: toJobOfferFormValues(offer),
    // Not `onTouched`: it validates a whole salary or bonus list when a row is added, new row included.
    mode: 'onBlur',
    resolver: zodResolver(jobOfferFormSchema),
  });
  const { clearErrors, formState, getValues, setError, trigger } = jobOfferForm;

  /** Checks a step's fields; leaving the compensation step also needs a salary or a bonus. */
  async function isStepValid(step: JobOfferFormStep) {
    clearErrors(`root.${step}`);

    const areFieldsValid = await trigger(STEP_FIELDS[step], { shouldFocus: true });

    if (!areFieldsValid) return false;
    if (step === 'basicInfo' || hasCompensation(getValues())) return true;

    setError('root.compensation', { type: 'required', message: 'compensation-required' });
    return false;
  }

  const [providedMachine] = useState(() =>
    jobOfferFormMachine.provide({
      actors: {
        validateStep: fromPromise(({ input }) => isStepValid(input.step)),
        validateForSave: fromPromise(async ({ input }) => {
          clearErrors('root');

          const isBasicInfoValid = await trigger(STEP_FIELDS.basicInfo);

          if (!isBasicInfoValid) return 'basicInfo';

          // Saving early checks the compensation fields, not that there is a salary or a bonus.
          const isCompensationValid = await (input.mode === 'draft'
            ? trigger(STEP_FIELDS.compensation)
            : isStepValid('compensation'));

          return isCompensationValid ? undefined : 'compensation';
        }),
        save: fromPromise(async () => {
          try {
            const saved = await onSave(toJobOfferRequest(jobOfferFormSchema.parse(getValues())));

            return { type: 'saved', jobOfferId: saved.id };
          } catch (error) {
            return applySaveError(error, jobOfferForm);
          }
        }),
      },
    }),
  );
  const [snapshot, send, actorRef] = useMachine(providedMachine, { input: { canSaveEarly } });
  const { shownStep, hasSaveFailed, savedJobOfferId } = snapshot.context;
  const isSaving = snapshot.matches('validatingSave') || snapshot.matches('saving');

  // Read during render: react-hook-form tracks `isDirty` only once something reads it.
  const { isDirty } = formState;
  const leaveBlocker = useBlocker({
    // A saved form is still dirty when it opens the saved offer: the machine says it is done.
    shouldBlockFn: () => isDirty && actorRef.getSnapshot().status !== 'done',
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });

  if (savedJobOfferId) {
    return (
      <Navigate params={{ jobOfferId: savedJobOfferId }} replace to="/job-offers/$jobOfferId" />
    );
  }

  const stepError =
    shownStep === 'review' ? undefined : formState.errors.root?.[shownStep]?.message;

  return (
    <FormProvider {...jobOfferForm}>
      <Paper
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          send({ type: shownStep === 'review' ? 'SAVE' : 'NEXT' });
        }}
        sx={{ p: 3 }}
        variant="outlined"
      >
        <Stack spacing={3}>
          <Stepper activeStep={JOB_OFFER_FORM_SCREEN_STEPS.indexOf(shownStep)} alternativeLabel>
            {JOB_OFFER_FORM_SCREEN_STEPS.map((step) => (
              <Step key={step}>
                <StepLabel>{t(`job-offer-form.steps.${STEP_LABEL_KEYS[step]}`)}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {hasSaveFailed && <Alert severity="error">{t('job-offer-form.save-failed')}</Alert>}
          {snapshot.matches('conflict') && (
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
            {shownStep !== 'basicInfo' && (
              <Button
                disabled={!snapshot.can({ type: 'BACK' })}
                onClick={() => send({ type: 'BACK' })}
              >
                {t('job-offer-form.back')}
              </Button>
            )}
            {canSaveEarly && shownStep !== 'review' && (
              <Button
                disabled={!snapshot.can({ type: 'SAVE_EARLY' })}
                loading={isSaving}
                onClick={() => send({ type: 'SAVE_EARLY' })}
                variant="outlined"
              >
                {t('job-offer-form.save-early')}
              </Button>
            )}
            {shownStep === 'review' ? (
              <Button
                disabled={!snapshot.can({ type: 'SAVE' })}
                loading={isSaving}
                type="submit"
                variant="contained"
              >
                {t(offer ? 'job-offer-form.save' : 'job-offer-form.create')}
              </Button>
            ) : (
              <Button disabled={!snapshot.can({ type: 'NEXT' })} type="submit" variant="contained">
                {t('job-offer-form.next')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
      <ConfirmDialog
        confirmLabel={t('job-offer-form.leave.confirm')}
        message={t('job-offer-form.leave.body')}
        onClose={() => leaveBlocker.reset?.()}
        onConfirm={() => leaveBlocker.proceed?.()}
        open={leaveBlocker.status === 'blocked'}
        title={t('job-offer-form.leave.title')}
      />
    </FormProvider>
  );
}

const STEP_LABEL_KEYS = {
  basicInfo: 'basic-info',
  compensation: 'compensation',
  review: 'review',
} as const satisfies Record<JobOfferFormScreenStep, string>;

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
