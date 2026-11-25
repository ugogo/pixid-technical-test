import { describe, expect, test } from 'vitest';

import {
  DEFAULT_JOB_OFFER_LIST_SEARCH,
  jobOfferListSearchSchema,
  toJobOfferListQuery,
} from './job-offer-list-search';

describe('jobOfferListSearchSchema', () => {
  test('fills the defaults', () => {
    expect(DEFAULT_JOB_OFFER_LIST_SEARCH).toEqual({
      page: 0,
      size: 20,
      sort: '-createdAt',
      status: [],
    });
  });

  test('falls back to the default for a value the URL cannot hold', () => {
    expect(
      jobOfferListSearchSchema.parse({
        page: -2,
        size: 500,
        sort: 'salary',
        status: ['DRAFT', 'ARCHIVED'],
        createdFrom: 'yesterday',
        titleContains: '',
      }),
    ).toEqual(DEFAULT_JOB_OFFER_LIST_SEARCH);
  });
});

describe('toJobOfferListQuery', () => {
  test('includes the whole "to" day', () => {
    const query = toJobOfferListQuery({
      page: 0,
      size: 20,
      sort: '-createdAt',
      status: [],
      createdFrom: '2026-10-01',
      createdTo: '2026-10-31',
    });

    expect(query).toMatchObject({
      createdAfter: new Date('2026-10-01T00:00:00').toISOString(),
      createdBefore: new Date('2026-11-01T00:00:00').toISOString(),
    });
  });
});
