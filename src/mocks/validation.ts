import { BONUS_TYPES, LOCATION_TYPES, SALARY_TYPES } from '@/shared/api/enums';
import type { components } from '@/shared/api/schema';
import { isOneOf } from '@/shared/is-one-of';

type Schemas = components['schemas'];

export type FieldError = Schemas['ValidationError']['fieldErrors'][number];
export type JobOfferContent = Pick<Schemas['JobOffer'], 'title' | 'location' | 'compensation'>;

const COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collects field errors the way the server words them, keyed by the swagger's JSON path. */
class FieldErrors {
  readonly errors: FieldError[] = [];

  add(field: string, message: string, rejectedValue?: unknown) {
    this.errors.push(
      rejectedValue === undefined ? { field, message } : { field, message, rejectedValue },
    );
  }

  text(
    field: string,
    value: unknown,
    { required = false, maxLength }: { required?: boolean; maxLength: number },
  ) {
    if (value === undefined || value === null) {
      if (required) this.add(field, 'must not be null');
      return;
    }

    if (typeof value !== 'string') {
      this.add(field, 'must be a string', value);
      return;
    }

    if (required && value.trim() === '') {
      this.add(field, 'must not be blank', value);
      return;
    }

    if (value.length > maxLength) {
      this.add(field, `size must be at most ${maxLength}`, value);
    }
  }

  pattern(field: string, value: unknown, pattern: RegExp) {
    if (typeof value !== 'string' || !pattern.test(value)) {
      this.add(field, `must match pattern '${pattern.source}'`, value);
    }
  }

  oneOf(field: string, value: unknown, allowed: readonly string[]) {
    if (!isOneOf(allowed, value)) {
      this.add(field, `must be one of ${allowed.join(', ')}`, value);
    }
  }

  amount(field: string, value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      this.add(field, 'must be a number', value);
      return;
    }

    if (value < 0) {
      this.add(field, 'must be greater than or equal to 0', value);
    }
  }
}

function validateAddress(errors: FieldErrors, address: unknown) {
  if (!isRecord(address)) {
    errors.add('location.address', 'must not be null');
    return;
  }

  if (address.lines !== undefined) {
    if (!Array.isArray(address.lines) || address.lines.length > 3) {
      errors.add('location.address.lines', 'must be a list of at most 3 lines', address.lines);
    } else {
      address.lines.forEach((line, index) =>
        errors.text(`location.address.lines[${index}]`, line, { maxLength: 100 }),
      );
    }
  }

  errors.text('location.address.postalCode', address.postalCode, { maxLength: 20 });
  errors.text('location.address.city', address.city, { required: true, maxLength: 100 });
  errors.text('location.address.region', address.region, { maxLength: 100 });
  errors.pattern('location.address.countryCode', address.countryCode, COUNTRY_CODE);
}

function validateLocation(errors: FieldErrors, location: unknown) {
  if (!isRecord(location)) {
    errors.add('location', 'must not be null');
    return;
  }

  errors.oneOf('location.type', location.type, LOCATION_TYPES);

  if (location.type === 'CUSTOM') {
    validateAddress(errors, location.address);
  }
}

function validateEntries(
  errors: FieldErrors,
  field: string,
  entries: unknown,
  types: readonly string[],
) {
  if (entries === undefined) return;

  if (!Array.isArray(entries)) {
    errors.add(field, 'must be a list', entries);
    return;
  }

  entries.forEach((entry: unknown, index) => {
    const path = `${field}[${index}]`;

    if (!isRecord(entry)) {
      errors.add(path, 'must be an object', entry);
      return;
    }

    errors.oneOf(`${path}.type`, entry.type, types);
    errors.amount(`${path}.amount`, entry.amount);
    errors.pattern(`${path}.currency`, entry.currency, CURRENCY_CODE);

    if (field.endsWith('bonusEntries')) {
      errors.text(`${path}.description`, entry.description, { maxLength: 200 });
    }
  });
}

function validateCompensation(errors: FieldErrors, compensation: unknown) {
  if (compensation === undefined) return;

  if (!isRecord(compensation)) {
    errors.add('compensation', 'must be an object', compensation);
    return;
  }

  validateEntries(errors, 'compensation.salaryEntries', compensation.salaryEntries, SALARY_TYPES);
  validateEntries(errors, 'compensation.bonusEntries', compensation.bonusEntries, BONUS_TYPES);
}

/**
 * Checks a create or update body against the swagger's constraints.
 * An update may leave any field out; a create needs a title and a location.
 */
export function validateJobOfferRequest(
  body: Record<string, unknown>,
  mode: 'create' | 'update',
): FieldError[] {
  const errors = new FieldErrors();
  const isCreate = mode === 'create';

  if (isCreate || body.title !== undefined) {
    errors.text('title', body.title, { required: true, maxLength: 200 });
  }

  if (isCreate || body.location !== undefined) {
    validateLocation(errors, body.location);
  }

  validateCompensation(errors, body.compensation);

  return errors.errors;
}

/** The fields a complete offer needs and this one lacks: title and location are always there. */
export function missingFields(content: JobOfferContent): string[] {
  const entryCount =
    (content.compensation?.salaryEntries?.length ?? 0) +
    (content.compensation?.bonusEntries?.length ?? 0);

  return entryCount > 0 ? [] : ['compensation'];
}
