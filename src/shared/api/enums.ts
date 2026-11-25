import type { components, operations } from './schema';

type Schemas = components['schemas'];

export type JobOfferStatus = Schemas['JobOfferStatus'];
export type TransitionAction = Schemas['TransitionAction'];
export type JobOfferSort = NonNullable<
  NonNullable<operations['listJobOffers']['parameters']['query']>['sort']
>;

// The swagger's enums as values, generated with the types, for the UI and the mock to iterate.
export {
  bonusTypeValues as BONUS_TYPES,
  jobOfferStatusValues as JOB_OFFER_STATUSES,
  locationTypeValues as LOCATION_TYPES,
  pathsJobOffersGetParametersQuerySortValues as JOB_OFFER_SORTS,
  salaryTypeValues as SALARY_TYPES,
  transitionActionValues as TRANSITION_ACTIONS,
} from './schema';
