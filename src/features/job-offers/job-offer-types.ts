import type { components, operations } from '@/shared/api/schema';

export type JobOfferPage = components['schemas']['JobOfferPage'];
export type JobOfferListQuery = NonNullable<operations['listJobOffers']['parameters']['query']>;
