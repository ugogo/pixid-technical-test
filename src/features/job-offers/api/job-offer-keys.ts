import type { JobOfferListQuery } from '../job-offer-types';

/** Nested so that invalidating a level reaches every query below it. */
export const jobOfferKeys = {
  all: ['job-offers'] as const,
  lists: () => [...jobOfferKeys.all, 'list'] as const,
  list: (query: JobOfferListQuery) => [...jobOfferKeys.lists(), query] as const,
  detail: (jobOfferId: string) => [...jobOfferKeys.all, 'detail', jobOfferId] as const,
  transitions: (jobOfferId: string) => [...jobOfferKeys.detail(jobOfferId), 'transitions'] as const,
  history: (jobOfferId: string) => [...jobOfferKeys.detail(jobOfferId), 'history'] as const,
};
