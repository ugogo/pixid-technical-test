import type { JobOfferStatus } from '@/shared/api/enums';

import type { JobOffer } from './job-offer-types';

/** The statuses the swagger allows an update in; the server's 409 stays the authority. */
const EDITABLE_STATUSES: JobOfferStatus[] = ['DRAFT', 'TO_FINALIZE'];

export function isEditable(offer: Pick<JobOffer, 'status'>) {
  return EDITABLE_STATUSES.includes(offer.status);
}
