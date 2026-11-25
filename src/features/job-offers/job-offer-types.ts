import type { components, operations } from '@/shared/api/schema';

type Schemas = components['schemas'];

export type JobOffer = Schemas['JobOffer'];
export type JobOfferPage = Schemas['JobOfferPage'];
export type JobOfferListQuery = NonNullable<operations['listJobOffers']['parameters']['query']>;
export type Transition = Schemas['AvailableTransitions']['transitions'][number];
export type TransitionHistoryEntry = Schemas['TransitionHistoryEntry'];
