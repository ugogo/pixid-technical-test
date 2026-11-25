import { describe, expect, test } from 'vitest';

import { ApiError } from './api-error';
import { createMockStore, type ListQuery } from './store';
import type { WorkflowConfiguration } from './workflow';

const COMPANY = 'company-a';
const OTHER_COMPANY = 'company-b';

const COMPLETE_OFFER = {
  title: 'Cariste (H/F)',
  location: { type: 'CUSTOM', address: { city: 'Lyon', countryCode: 'FR' } },
  compensation: { salaryEntries: [{ type: 'HOURLY', amount: 12.5, currency: 'EUR' }] },
};
const PARTIAL_OFFER = { title: 'Magasinier (H/F)', location: { type: 'COMPANY_ADDRESS' } };

function storeWith(flags: Partial<WorkflowConfiguration> = {}) {
  let tick = 0;
  let idCount = 0;
  const store = createMockStore({
    now: () => new Date(Date.UTC(2026, 0, 1) + tick++ * 1000),
    createId: () => `id-${++idCount}`,
  });

  store.updateConfiguration(COMPANY, COMPANY, flags);

  return store;
}

function refusal(run: () => unknown): ApiError {
  try {
    run();
  } catch (error) {
    if (error instanceof ApiError) return error;

    throw error;
  }

  throw new Error('Expected the store to refuse');
}

const query: ListQuery = { page: 0, size: 20, sort: '-createdAt', statuses: [] };

describe('workflow', () => {
  test('a complete offer is created in DRAFT and goes through every configured step', () => {
    const store = storeWith({ approvalRequired: true, manualPostingRequired: true });
    const { id, status } = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    expect(status).toBe('DRAFT');
    expect(store.transitionJobOffer(COMPANY, id, 'submit', {}).status).toBe('TO_APPROVE');
    expect(store.transitionJobOffer(COMPANY, id, 'approve', {}).status).toBe('TO_POST');

    const published = store.transitionJobOffer(COMPANY, id, 'post', {});

    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).not.toBeNull();
    expect(store.getHistory(COMPANY, id).map((entry) => entry.action)).toEqual([
      'submit',
      'approve',
      'post',
    ]);
  });

  test('without optional steps, submit publishes at once', () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    expect(store.transitionJobOffer(COMPANY, id, 'submit', {}).status).toBe('PUBLISHED');
  });

  test('with partial save, an offer without compensation starts in TO_FINALIZE', () => {
    const store = storeWith({ partialSaveEnabled: true });
    const offer = store.createJobOffer(COMPANY, PARTIAL_OFFER);

    expect(offer).toMatchObject({ status: 'TO_FINALIZE', isComplete: false });

    const incomplete = refusal(() => store.transitionJobOffer(COMPANY, offer.id, 'finalize', {}));

    expect(incomplete.status).toBe(422);
    expect(incomplete.body).toMatchObject({
      code: 'INCOMPLETE_OFFER',
      details: { missingFields: ['compensation'] },
    });

    store.updateJobOffer(COMPANY, offer.id, { compensation: COMPLETE_OFFER.compensation });

    expect(store.transitionJobOffer(COMPANY, offer.id, 'finalize', {}).status).toBe('PUBLISHED');
  });

  test('without partial save, an offer without compensation is refused', () => {
    const error = refusal(() => storeWith().createJobOffer(COMPANY, PARTIAL_OFFER));

    expect(error.status).toBe(422);
    expect(error.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: [{ field: 'compensation' }],
    });
  });

  test('an incomplete draft is submitted to TO_FINALIZE', () => {
    const store = storeWith({ partialSaveEnabled: true });
    const { id } = store.createJobOffer(COMPANY, PARTIAL_OFFER);

    store.transitionJobOffer(COMPANY, id, 'withdraw', {});

    expect(store.transitionJobOffer(COMPANY, id, 'submit', {}).status).toBe('TO_FINALIZE');
  });

  test('reject needs a reason and keeps it in the history', () => {
    const store = storeWith({ approvalRequired: true });
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    store.transitionJobOffer(COMPANY, id, 'submit', {});

    expect(refusal(() => store.transitionJobOffer(COMPANY, id, 'reject', {})).body).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: [{ field: 'reason', message: 'must not be blank' }],
    });

    const rejected = store.transitionJobOffer(COMPANY, id, 'reject', { reason: 'Salary too low' });

    expect(rejected.status).toBe('DRAFT');
    expect(store.getHistory(COMPANY, id).at(-1)).toMatchObject({
      action: 'reject',
      fromStatus: 'TO_APPROVE',
      toStatus: 'DRAFT',
      reason: 'Salary too low',
    });
  });

  test('a transition the status does not allow is refused with the valid actions', () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);
    const error = refusal(() => store.transitionJobOffer(COMPANY, id, 'approve', {}));

    expect(error.status).toBe(400);
    expect(error.body).toMatchObject({
      code: 'INVALID_TRANSITION',
      details: { currentStatus: 'DRAFT', requestedAction: 'approve', validActions: ['submit'] },
    });
    expect(refusal(() => store.transitionJobOffer(COMPANY, id, 'teleport', {})).body).toMatchObject(
      {
        code: 'BAD_REQUEST',
      },
    );
  });

  test('close and reopen keep the first publication date', () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);
    const { publishedAt } = store.transitionJobOffer(COMPANY, id, 'submit', {});
    const closed = store.transitionJobOffer(COMPANY, id, 'close', {});

    expect(closed.closedAt).not.toBeNull();

    const reopened = store.transitionJobOffer(COMPANY, id, 'reopen', {});

    expect(reopened).toMatchObject({ status: 'PUBLISHED', publishedAt, closedAt: null });
    expect(store.transitionJobOffer(COMPANY, id, 'withdraw', {})).toMatchObject({
      status: 'DRAFT',
      publishedAt: null,
    });
  });

  test('a configuration change applies to new offers only', () => {
    const store = storeWith();
    const before = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    store.updateConfiguration(COMPANY, COMPANY, { approvalRequired: true });
    const after = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    expect(store.transitionJobOffer(COMPANY, before.id, 'submit', {}).status).toBe('PUBLISHED');
    expect(store.transitionJobOffer(COMPANY, after.id, 'submit', {}).status).toBe('TO_APPROVE');
  });
});

describe('edit and delete', () => {
  test('an offer past TO_FINALIZE can no longer be edited or deleted', () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    store.transitionJobOffer(COMPANY, id, 'submit', {});

    expect(refusal(() => store.updateJobOffer(COMPANY, id, { title: 'New' })).body).toEqual({
      code: 'INVALID_STATE',
      message: 'Cannot update job offer in PUBLISHED status',
      details: { currentStatus: 'PUBLISHED', allowedStatuses: ['DRAFT', 'TO_FINALIZE'] },
    });
    expect(refusal(() => store.deleteJobOffer(COMPANY, id)).status).toBe(409);
  });

  test('an update replaces the fields it carries and drops a company address', () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);
    const updated = store.updateJobOffer(COMPANY, id, {
      location: { type: 'COMPANY_ADDRESS', address: { city: 'Lyon', countryCode: 'FR' } },
    });

    expect(updated).toMatchObject({
      title: COMPLETE_OFFER.title,
      location: { type: 'COMPANY_ADDRESS' },
      compensation: COMPLETE_OFFER.compensation,
    });
    expect(updated.location.address).toBeUndefined();
  });

  test('a draft is deleted', () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    store.deleteJobOffer(COMPANY, id);

    expect(refusal(() => store.getJobOffer(COMPANY, id)).status).toBe(404);
  });

  test("another company's offer is not found", () => {
    const store = storeWith();
    const { id } = store.createJobOffer(COMPANY, COMPLETE_OFFER);

    expect(refusal(() => store.getJobOffer(OTHER_COMPANY, id)).status).toBe(404);
    expect(store.listJobOffers(OTHER_COMPANY, query).totalElements).toBe(0);
  });
});

describe('validation', () => {
  test('field errors follow the swagger paths', () => {
    const error = refusal(() =>
      storeWith().createJobOffer(COMPANY, {
        title: ' ',
        location: { type: 'CUSTOM', address: { city: 'Paris', countryCode: 'France' } },
        compensation: { salaryEntries: [{ type: 'YEARLY', amount: -1, currency: 'euro' }] },
      }),
    );

    expect(error.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: [
        { field: 'title', message: 'must not be blank' },
        { field: 'location.address.countryCode', rejectedValue: 'France' },
        {
          field: 'compensation.salaryEntries[0].amount',
          message: 'must be greater than or equal to 0',
        },
        { field: 'compensation.salaryEntries[0].currency', rejectedValue: 'euro' },
      ],
    });
  });

  test('a custom location needs an address', () => {
    const error = refusal(() =>
      storeWith().createJobOffer(COMPANY, { ...COMPLETE_OFFER, location: { type: 'CUSTOM' } }),
    );

    expect(error.body).toMatchObject({ fieldErrors: [{ field: 'location.address' }] });
  });
});

function storeWithOffers() {
  const store = storeWith();

  for (const [title, city] of [
    ['Cariste', 'Lyon'],
    ['Agent de quai', 'Paris'],
    ['Cariste de nuit', 'Villeurbanne'],
  ] as const) {
    store.createJobOffer(COMPANY, {
      ...COMPLETE_OFFER,
      title,
      location: { type: 'CUSTOM', address: { city, countryCode: 'FR' } },
    });
  }

  store.createJobOffer(COMPANY, {
    ...COMPLETE_OFFER,
    title: 'Comptable',
    location: { type: 'COMPANY_ADDRESS' },
  });

  return store;
}

function titles(store: ReturnType<typeof storeWith>, overrides: Partial<ListQuery>) {
  return store
    .listJobOffers(COMPANY, { ...query, ...overrides })
    .content.map((offer) => offer.title);
}

describe('listJobOffers', () => {
  test('newest first by default, and pages', () => {
    const store = storeWithOffers();

    expect(titles(store, {})).toEqual(['Comptable', 'Cariste de nuit', 'Agent de quai', 'Cariste']);
    expect(store.listJobOffers(COMPANY, { ...query, size: 3, page: 1 })).toMatchObject({
      content: [{ title: 'Cariste' }],
      totalElements: 4,
      totalPages: 2,
    });
  });

  test('filters by title, city and status, ignoring case', () => {
    const store = storeWithOffers();

    expect(titles(store, { titleContains: 'CARISTE' })).toEqual(['Cariste de nuit', 'Cariste']);
    expect(titles(store, { locationCity: 'lyon' })).toEqual(['Cariste']);
    expect(titles(store, { statuses: ['PUBLISHED'] })).toEqual([]);
  });

  test('createdAfter is inclusive, createdBefore exclusive', () => {
    const store = storeWithOffers();
    const [, second] = store.listJobOffers(COMPANY, { ...query, sort: 'createdAt' }).content;
    const createdAt = second?.createdAt;

    expect(titles(store, { createdAfter: createdAt, sort: 'createdAt' })[0]).toBe('Agent de quai');
    expect(titles(store, { createdBefore: createdAt, sort: 'createdAt' })).toEqual(['Cariste']);
  });

  test('sorts by title, and puts unpublished offers last', () => {
    const store = storeWithOffers();
    const [published] = store.listJobOffers(COMPANY, { ...query, titleContains: 'quai' }).content;

    store.transitionJobOffer(COMPANY, published?.id ?? '', 'submit', {});

    expect(titles(store, { sort: 'title' })).toEqual([
      'Agent de quai',
      'Cariste',
      'Cariste de nuit',
      'Comptable',
    ]);
    expect(titles(store, { sort: '-publishedAt' })[0]).toBe('Agent de quai');
    expect(titles(store, { sort: 'publishedAt' })[0]).toBe('Agent de quai');
  });

  test('a company address has no city', () => {
    const store = storeWithOffers();

    expect(
      store.listJobOffers(COMPANY, { ...query, titleContains: 'Comptable' }).content[0]
        ?.locationCity,
    ).toBeNull();
  });
});

describe('configuration', () => {
  test("another company's configuration is forbidden", () => {
    const store = storeWith();

    expect(refusal(() => store.getConfiguration(COMPANY, OTHER_COMPANY)).status).toBe(403);
  });

  test('a flag that is not a boolean is refused', () => {
    const store = storeWith();

    expect(
      refusal(() => store.updateConfiguration(COMPANY, COMPANY, { approvalRequired: 'yes' }))
        .status,
    ).toBe(400);
  });
});
