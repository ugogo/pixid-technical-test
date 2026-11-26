import { TextField, type TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { isOneOf } from '@/shared/is-one-of';

import {
  FORM_ERROR_KEYS,
  type JobOfferFormField,
  type JobOfferFormValues,
} from './job-offer-form-schema';

/** A form error in words: the schema's keys are translated, the server's messages shown as is. */
export function useFormErrorText() {
  const { t } = useTranslation();

  return (message: string | undefined) =>
    message && isOneOf(FORM_ERROR_KEYS, message) ? t(`job-offer-form.errors.${message}`) : message;
}

type FormTextFieldProps = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText' | 'inputRef'
> & {
  name: JobOfferFormField;
  /** Shows the count of typed characters against this limit, under the field. */
  characterLimit?: number;
};

/** A MUI text field bound to one field of the job offer form, showing its error under it. */
export function FormTextField({ name, characterLimit, ...textFieldProps }: FormTextFieldProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<JobOfferFormValues>({ name });
  const formErrorText = useFormErrorText();
  const { ref, ...fieldProps } = field;
  const characterCount =
    characterLimit === undefined
      ? undefined
      : t('job-offer-form.character-count', {
          count: typeof field.value === 'string' ? field.value.length : 0,
          limit: characterLimit,
        });

  return (
    <TextField
      fullWidth
      {...textFieldProps}
      {...fieldProps}
      error={fieldState.error !== undefined}
      helperText={formErrorText(fieldState.error?.message) ?? characterCount}
      inputRef={ref}
    />
  );
}
