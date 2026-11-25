import { Button, Grid, IconButton, MenuItem, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { BONUS_TYPES, SALARY_TYPES } from '@/shared/api/enums';
import { Section } from '@/shared/ui/section';

import { FormTextField } from './form-text-field';
import {
  EMPTY_BONUS_ENTRY,
  EMPTY_SALARY_ENTRY,
  type JobOfferFormValues,
} from './job-offer-form-schema';

/** The offer's salaries and bonuses, each a list the user adds rows to. */
export function CompensationStep() {
  const { t } = useTranslation();
  const salaryEntries = useFieldArray<JobOfferFormValues, 'compensation.salaryEntries'>({
    name: 'compensation.salaryEntries',
  });
  const bonusEntries = useFieldArray<JobOfferFormValues, 'compensation.bonusEntries'>({
    name: 'compensation.bonusEntries',
  });

  return (
    <Stack spacing={4}>
      <EntryListSection
        addLabel={t('job-offer-form.add-salary')}
        emptyText={t('job-offer-form.no-salary')}
        isEmpty={salaryEntries.fields.length === 0}
        onAdd={() => salaryEntries.append(EMPTY_SALARY_ENTRY)}
        title={t('job-offer-form.fields.salaries')}
      >
        {salaryEntries.fields.map((salaryEntry, index) => (
          <Grid container key={salaryEntry.id} spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormTextField
                label={t('job-offer-form.fields.amount')}
                name={`compensation.salaryEntries.${index}.amount`}
                required
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormTextField
                label={t('job-offer-form.fields.currency')}
                name={`compensation.salaryEntries.${index}.currency`}
                required
                slotProps={{ htmlInput: { maxLength: 3 } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <FormTextField
                label={t('job-offer-form.fields.salary-type')}
                name={`compensation.salaryEntries.${index}.type`}
                select
              >
                {SALARY_TYPES.map((salaryType) => (
                  <MenuItem key={salaryType} value={salaryType}>
                    {t(`salary-types.${salaryType}`)}
                  </MenuItem>
                ))}
              </FormTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 1 }}>
              <IconButton
                aria-label={t('job-offer-form.remove-salary', { number: index + 1 })}
                onClick={() => salaryEntries.remove(index)}
              >
                ✕
              </IconButton>
            </Grid>
          </Grid>
        ))}
      </EntryListSection>
      <EntryListSection
        addLabel={t('job-offer-form.add-bonus')}
        emptyText={t('job-offer-form.no-bonus')}
        isEmpty={bonusEntries.fields.length === 0}
        onAdd={() => bonusEntries.append(EMPTY_BONUS_ENTRY)}
        title={t('job-offer-form.fields.bonuses')}
      >
        {bonusEntries.fields.map((bonusEntry, index) => (
          <Grid container key={bonusEntry.id} spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormTextField
                label={t('job-offer-form.fields.bonus-type')}
                name={`compensation.bonusEntries.${index}.type`}
                select
              >
                {BONUS_TYPES.map((bonusType) => (
                  <MenuItem key={bonusType} value={bonusType}>
                    {t(`bonus-types.${bonusType}`)}
                  </MenuItem>
                ))}
              </FormTextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <FormTextField
                label={t('job-offer-form.fields.amount')}
                name={`compensation.bonusEntries.${index}.amount`}
                required
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormTextField
                label={t('job-offer-form.fields.currency')}
                name={`compensation.bonusEntries.${index}.currency`}
                required
                slotProps={{ htmlInput: { maxLength: 3 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 1 }}>
              <IconButton
                aria-label={t('job-offer-form.remove-bonus', { number: index + 1 })}
                onClick={() => bonusEntries.remove(index)}
              >
                ✕
              </IconButton>
            </Grid>
            <Grid size={{ xs: 12, sm: 11 }}>
              <FormTextField
                label={t('job-offer-form.fields.description')}
                name={`compensation.bonusEntries.${index}.description`}
              />
            </Grid>
          </Grid>
        ))}
      </EntryListSection>
    </Stack>
  );
}

interface EntryListSectionProps {
  title: string;
  emptyText: string;
  addLabel: string;
  isEmpty: boolean;
  onAdd: () => void;
  children: ReactNode;
}

/** A list of salary or bonus rows, with a button to add one. */
function EntryListSection({
  title,
  emptyText,
  addLabel,
  isEmpty,
  onAdd,
  children,
}: EntryListSectionProps) {
  const { clearErrors } = useFormContext<JobOfferFormValues>();

  return (
    <Section title={title}>
      {isEmpty && <Typography color="text.secondary">{emptyText}</Typography>}
      {children}
      <Button
        onClick={() => {
          clearErrors('root.compensation');
          onAdd();
        }}
        sx={{ alignSelf: 'flex-start' }}
      >
        {addLabel}
      </Button>
    </Section>
  );
}
