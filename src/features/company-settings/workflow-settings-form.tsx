import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Paper,
  Stack,
} from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type {
  CompanyConfiguration,
  UpdateCompanyConfigurationRequest,
} from './company-configuration-types';

/** The workflow's optional steps, each one a flag the company turns on or off. */
const WORKFLOW_FLAGS = ['approvalRequired', 'partialSaveEnabled', 'manualPostingRequired'] as const;

type WorkflowSettings = Required<UpdateCompanyConfigurationRequest>;

function toWorkflowSettings(configuration: CompanyConfiguration): WorkflowSettings {
  return {
    approvalRequired: configuration.approvalRequired,
    partialSaveEnabled: configuration.partialSaveEnabled,
    manualPostingRequired: configuration.manualPostingRequired,
  };
}

interface WorkflowSettingsFormProps {
  configuration: CompanyConfiguration;
  /** Sends the request and resolves with the saved configuration. */
  onSave: (request: WorkflowSettings) => Promise<CompanyConfiguration>;
}

/** The company's workflow flags, saved together. */
export function WorkflowSettingsForm({ configuration, onSave }: WorkflowSettingsFormProps) {
  const { t } = useTranslation();
  const { control, formState, handleSubmit, reset } = useForm<WorkflowSettings>({
    defaultValues: toWorkflowSettings(configuration),
  });
  const [saveOutcome, setSaveOutcome] = useState<'saved' | 'failed'>();

  const saveSettings = handleSubmit(async (settings) => {
    setSaveOutcome(undefined);

    const saved = await onSave(settings).catch(() => undefined);

    if (!saved) {
      setSaveOutcome('failed');
      return;
    }

    reset(toWorkflowSettings(saved));
    setSaveOutcome('saved');
  });

  return (
    <Paper component="form" noValidate onSubmit={saveSettings} sx={{ p: 3 }} variant="outlined">
      <Stack spacing={3}>
        <FormGroup>
          {WORKFLOW_FLAGS.map((flag) => (
            <Controller
              control={control}
              key={flag}
              name={flag}
              render={({ field: { value, onChange, ref, ...field } }) => (
                <div>
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value}
                        onChange={(event) => onChange(event.target.checked)}
                        slotProps={{ input: { ref, 'aria-describedby': `${flag}-description` } }}
                      />
                    }
                    label={t(`settings.flags.${flag}.label`)}
                  />
                  <FormHelperText id={`${flag}-description`} sx={{ mt: 0, ml: 4 }}>
                    {t(`settings.flags.${flag}.description`)}
                  </FormHelperText>
                </div>
              )}
            />
          ))}
        </FormGroup>
        <Alert severity="warning">{t('settings.new-offers-only')}</Alert>
        {saveOutcome === 'saved' && <Alert severity="success">{t('settings.saved')}</Alert>}
        {saveOutcome === 'failed' && <Alert severity="error">{t('settings.save-failed')}</Alert>}
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button
            disabled={!formState.isDirty}
            loading={formState.isSubmitting}
            type="submit"
            variant="contained"
          >
            {t('settings.save')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
