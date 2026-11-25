import { get, type FieldPath } from 'react-hook-form';
import { z } from 'zod';

import { BONUS_TYPES, SALARY_TYPES } from '@/shared/api/enums';
import type { components } from '@/shared/api/schema';

import type { JobOffer } from '../job-offer-types';

export type JobOfferRequest = components['schemas']['CreateJobOfferRequest'];

/** Each message is a key under `job-offer-form.errors`; a server message shows as it is. */
export const FORM_ERROR_KEYS = [
  'required',
  'too-long',
  'too-many-lines',
  'country-code',
  'currency-code',
  'amount',
  'compensation-required',
] as const;

const MAX_ADDRESS_LINES = 3;

const optionalText = (maxLength: number) => z.string().trim().max(maxLength, 'too-long');
const requiredText = (maxLength: number) => optionalText(maxLength).min(1, 'required');
const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'currency-code');
// An amount field holds what the user typed; an empty one is missing, not 0.
const amount = z
  .string()
  .trim()
  .min(1, 'required')
  .pipe(z.coerce.number<string>({ error: 'amount' }).min(0, 'amount'));

/** The address as the form holds it: its lines in one multiline field. */
const addressSchema = z.object({
  lines: z
    .string()
    .refine((lines) => lines.split('\n').length <= MAX_ADDRESS_LINES, 'too-many-lines')
    .refine((lines) => lines.split('\n').every((line) => line.length <= 100), 'too-long'),
  postalCode: optionalText(20),
  city: requiredText(100),
  region: optionalText(100),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'country-code'),
});

/**
 * The swagger's field constraints. It leaves out the rule that a complete offer needs a salary or
 * a bonus: saving early skips it, so the form checks it on its own (`hasCompensation`).
 */
export const jobOfferFormSchema = z.object({
  title: requiredText(200),
  location: z.discriminatedUnion('type', [
    // A company address keeps what was typed for a custom one, unchecked, in case the user
    // switches back.
    z.object({ type: z.literal('COMPANY_ADDRESS'), address: z.record(z.string(), z.string()) }),
    z.object({ type: z.literal('CUSTOM'), address: addressSchema }),
  ]),
  compensation: z.object({
    salaryEntries: z.array(
      z.object({ type: z.enum(SALARY_TYPES), amount, currency: currencyCode }),
    ),
    bonusEntries: z.array(
      z.object({
        type: z.enum(BONUS_TYPES),
        amount,
        currency: currencyCode,
        description: optionalText(200),
      }),
    ),
  }),
});

export type JobOfferFormValues = z.input<typeof jobOfferFormSchema>;
export type JobOfferFormOutput = z.output<typeof jobOfferFormSchema>;
export type JobOfferFormField = FieldPath<JobOfferFormValues>;

const EMPTY_ADDRESS = { lines: '', postalCode: '', city: '', region: '', countryCode: 'FR' };

type Compensation = JobOfferFormValues['compensation'];

export const EMPTY_SALARY_ENTRY: Compensation['salaryEntries'][number] = {
  type: 'MONTHLY',
  amount: '',
  currency: 'EUR',
};
export const EMPTY_BONUS_ENTRY: Compensation['bonusEntries'][number] = {
  type: 'ANNUAL',
  amount: '',
  currency: 'EUR',
  description: '',
};

/** The form's starting values: an offer's, or empty ones for a new offer. */
export function toJobOfferFormValues(offer?: JobOffer): JobOfferFormValues {
  const address = offer?.location.address;

  return {
    title: offer?.title ?? '',
    location: {
      type: offer?.location.type ?? 'COMPANY_ADDRESS',
      address: address
        ? {
            lines: address.lines?.join('\n') ?? '',
            postalCode: address.postalCode ?? '',
            city: address.city,
            region: address.region ?? '',
            countryCode: address.countryCode,
          }
        : EMPTY_ADDRESS,
    },
    compensation: {
      salaryEntries: (offer?.compensation?.salaryEntries ?? []).map((entry) => ({
        ...entry,
        amount: String(entry.amount),
      })),
      bonusEntries: (offer?.compensation?.bonusEntries ?? []).map((entry) => ({
        ...entry,
        amount: String(entry.amount),
        description: entry.description ?? '',
      })),
    },
  };
}

/** Whether the values hold what a complete offer needs beyond its fields: a salary or a bonus. */
export function hasCompensation({ compensation }: Pick<JobOfferFormValues, 'compensation'>) {
  return compensation.salaryEntries.length + compensation.bonusEntries.length > 0;
}

/** The request body: empty optional fields left out, and a company address sent without one. */
export function toJobOfferRequest(values: JobOfferFormOutput): JobOfferRequest {
  const { location, compensation } = values;

  return {
    title: values.title,
    location:
      location.type === 'CUSTOM'
        ? {
            type: 'CUSTOM',
            address: {
              lines: location.address.lines
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
              postalCode: location.address.postalCode || undefined,
              city: location.address.city,
              region: location.address.region || undefined,
              countryCode: location.address.countryCode,
            },
          }
        : { type: 'COMPANY_ADDRESS' },
    compensation: {
      salaryEntries: compensation.salaryEntries,
      bonusEntries: compensation.bonusEntries.map(({ description, ...entry }) => ({
        ...entry,
        description: description || undefined,
      })),
    },
  };
}

/**
 * The form field a server error names: `compensation.salaryEntries[0].amount` becomes
 * `compensation.salaryEntries.0.amount`, and an address line becomes the lines field.
 */
export function toFormField(
  serverField: string,
  values: JobOfferFormValues,
): JobOfferFormField | undefined {
  const path = serverField
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^(location\.address\.lines)\.\d+$/, '$1');

  return isShownField(path, values) ? path : undefined;
}

/** A field the form shows holds what was typed; `compensation` or `location.address` hold more. */
function isShownField(path: string, values: JobOfferFormValues): path is JobOfferFormField {
  return typeof get(values, path) === 'string';
}
