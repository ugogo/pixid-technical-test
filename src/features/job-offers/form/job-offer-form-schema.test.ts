import { describe, expect, test } from 'vitest';

import type { JobOffer } from '../job-offer-types';
import {
  hasCompensation,
  jobOfferFormSchema,
  toFormField,
  toJobOfferFormValues,
  toJobOfferRequest,
  type JobOfferFormValues,
} from './job-offer-form-schema';

const customOfferValues: JobOfferFormValues = {
  title: '  Soudeur TIG (H/F) ',
  location: {
    type: 'CUSTOM',
    address: {
      lines: '12 quai de la Fosse\nBâtiment B',
      postalCode: '',
      city: 'Nantes',
      region: '',
      countryCode: 'fr',
    },
  },
  compensation: {
    salaryEntries: [{ type: 'MONTHLY', amount: '2050.50', currency: 'eur' }],
    bonusEntries: [{ type: 'SIGNING', amount: '500', currency: 'EUR', description: '' }],
  },
};

function errorMessages(values: JobOfferFormValues) {
  const parsedJobOfferForm = jobOfferFormSchema.safeParse(values);

  return Object.fromEntries(
    (parsedJobOfferForm.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
  );
}

function withSalaryAmount(amount: string): JobOfferFormValues {
  return {
    ...customOfferValues,
    compensation: {
      salaryEntries: [{ type: 'MONTHLY', amount, currency: 'EUR' }],
      bonusEntries: [],
    },
  };
}

function amountOf(typed: string) {
  return jobOfferFormSchema.parse(withSalaryAmount(typed)).compensation.salaryEntries[0]?.amount;
}

function withLines(lines: string): JobOfferFormValues {
  return {
    ...customOfferValues,
    location: {
      type: 'CUSTOM',
      address: { lines, postalCode: '', city: 'Nantes', region: '', countryCode: 'FR' },
    },
  };
}

describe('jobOfferFormSchema', () => {
  test('trims text, upper-cases codes and reads amounts as numbers', () => {
    const jobOfferFormOutput = jobOfferFormSchema.parse(customOfferValues);

    expect(jobOfferFormOutput.title).toBe('Soudeur TIG (H/F)');
    expect(jobOfferFormOutput.location.address).toMatchObject({ countryCode: 'FR' });
    expect(jobOfferFormOutput.compensation.salaryEntries[0]).toEqual({
      type: 'MONTHLY',
      amount: 2050.5,
      currency: 'EUR',
    });
  });

  test('an empty amount is missing, not 0; a negative or unreadable one is refused', () => {
    expect(errorMessages(withSalaryAmount(''))).toEqual({
      'compensation.salaryEntries.0.amount': 'required',
    });
    expect(errorMessages(withSalaryAmount('-1'))).toEqual({
      'compensation.salaryEntries.0.amount': 'amount',
    });
    for (const unreadable of ['abc', '0x10', '1e3', '12,5,0']) {
      expect(errorMessages(withSalaryAmount(unreadable))).toEqual({
        'compensation.salaryEntries.0.amount': 'amount',
      });
    }
  });

  test('reads a decimal comma and spaced thousands, as French writes them', () => {
    expect(amountOf('12,50')).toBe(12.5);
    expect(amountOf('45 000')).toBe(45000);
    expect(amountOf(' 2600.5 ')).toBe(2600.5);
  });

  test('counts the address lines that will be sent: trimmed, blank ones left out', () => {
    expect(errorMessages(withLines('a\nb\nc\n'))).toEqual({});
    expect(errorMessages(withLines('a\n\nb\n  \nc'))).toEqual({});
    expect(errorMessages(withLines(`     ${'x'.repeat(100)}`))).toEqual({});
    expect(errorMessages(withLines('a\nb\nc\nd'))).toEqual({
      'location.address.lines': 'too-many-lines',
    });
  });

  test('checks a custom address, and leaves a kept one alone under a company address', () => {
    const address = { lines: 'a\nb\nc\nd', postalCode: '', city: '', region: '', countryCode: 'F' };

    expect(
      errorMessages({ ...customOfferValues, title: '', location: { type: 'CUSTOM', address } }),
    ).toEqual({
      title: 'required',
      'location.address.lines': 'too-many-lines',
      'location.address.city': 'required',
      'location.address.countryCode': 'country-code',
    });
    expect(
      errorMessages({ ...customOfferValues, location: { type: 'COMPANY_ADDRESS', address } }),
    ).toEqual({});
  });
});

describe('toJobOfferRequest', () => {
  test('leaves out empty optional fields', () => {
    const request = toJobOfferRequest(jobOfferFormSchema.parse(customOfferValues));

    expect(request.location).toEqual({
      type: 'CUSTOM',
      address: {
        lines: ['12 quai de la Fosse', 'Bâtiment B'],
        city: 'Nantes',
        countryCode: 'FR',
      },
    });
    expect(request.compensation?.bonusEntries).toEqual([
      { type: 'SIGNING', amount: 500, currency: 'EUR' },
    ]);
  });

  test('sends a company address without the address kept in the form', () => {
    const request = toJobOfferRequest(
      jobOfferFormSchema.parse({
        ...customOfferValues,
        location: { ...customOfferValues.location, type: 'COMPANY_ADDRESS' },
      }),
    );

    expect(request.location).toEqual({ type: 'COMPANY_ADDRESS' });
  });
});

describe('toJobOfferFormValues', () => {
  test('starts a new offer empty, at the company address', () => {
    const values = toJobOfferFormValues();

    expect(values.title).toBe('');
    expect(values.location.type).toBe('COMPANY_ADDRESS');
    expect(hasCompensation(values)).toBe(false);
  });

  test("holds an offer's fields as the form edits them", () => {
    const offer: JobOffer = {
      id: '00000000-0000-4000-8000-000000000001',
      companyId: '00000000-0000-4000-8000-000000000000',
      title: 'Soudeur TIG (H/F)',
      status: 'DRAFT',
      location: {
        type: 'CUSTOM',
        address: { lines: ['1 rue A', '2e étage'], city: 'Nantes', countryCode: 'FR' },
      },
      compensation: { salaryEntries: [{ type: 'HOURLY', amount: 14.5, currency: 'EUR' }] },
      createdAt: '2026-11-01T10:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
    };

    expect(toJobOfferFormValues(offer)).toEqual({
      title: 'Soudeur TIG (H/F)',
      location: {
        type: 'CUSTOM',
        address: {
          lines: '1 rue A\n2e étage',
          postalCode: '',
          city: 'Nantes',
          region: '',
          countryCode: 'FR',
        },
      },
      compensation: {
        salaryEntries: [{ type: 'HOURLY', amount: '14.5', currency: 'EUR' }],
        bonusEntries: [],
      },
    });
  });
});

describe('toFormField', () => {
  test.each([
    ['title', 'title'],
    ['compensation.salaryEntries[0].amount', 'compensation.salaryEntries.0.amount'],
    ['location.address.lines[1]', 'location.address.lines'],
    ['compensation.salaryEntries[3].amount', undefined],
    ['location.address', undefined],
    ['compensation', undefined],
    ['workflow', undefined],
  ])('reads the server field %s as %s', (serverField, formField) => {
    expect(toFormField(serverField, customOfferValues)).toBe(formField);
  });
});
