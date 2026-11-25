import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
} from '@mui/material';
import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormTextField } from './form-text-field';
import { TITLE_MAX_LENGTH, type JobOfferFormValues } from './job-offer-form-schema';

/** The offer's title and where the job is. */
export function BasicInfoStep() {
  const { t } = useTranslation();
  const {
    field: { disabled, ...locationTypeField },
  } = useController<JobOfferFormValues, 'location.type'>({ name: 'location.type' });

  return (
    <Stack spacing={3}>
      <FormTextField
        characterLimit={TITLE_MAX_LENGTH}
        label={t('job-offer-form.fields.title')}
        name="title"
        required
      />
      <FormControl disabled={disabled}>
        <FormLabel id="location-type-label">{t('job-offer-form.fields.location')}</FormLabel>
        <RadioGroup aria-labelledby="location-type-label" row {...locationTypeField}>
          <FormControlLabel
            control={<Radio />}
            label={t('job-offer-form.fields.company-address')}
            value="COMPANY_ADDRESS"
          />
          <FormControlLabel
            control={<Radio />}
            label={t('job-offer-form.fields.custom-address')}
            value="CUSTOM"
          />
        </RadioGroup>
      </FormControl>
      {locationTypeField.value === 'CUSTOM' && (
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormTextField
              label={t('job-offer-form.fields.address-lines')}
              maxRows={3}
              minRows={2}
              multiline
              name="location.address.lines"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormTextField
              label={t('job-offer-form.fields.postal-code')}
              name="location.address.postalCode"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <FormTextField
              label={t('job-offer-form.fields.city')}
              name="location.address.city"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <FormTextField
              label={t('job-offer-form.fields.region')}
              name="location.address.region"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormTextField
              label={t('job-offer-form.fields.country-code')}
              name="location.address.countryCode"
              required
              slotProps={{ htmlInput: { maxLength: 2 } }}
            />
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
