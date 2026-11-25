import { createFileRoute, type ErrorComponentProps } from '@tanstack/react-router';

import { NotFound } from '@/app/not-found';
import { RootError } from '@/app/root-error';
import { JobOfferScreen } from '@/screens/job-offer/job-offer-screen';
import { ApiRequestError } from '@/shared/api/api-request-error';

/** An offer the API does not know is a missing page, not a failure to retry. */
function JobOfferError({ error }: ErrorComponentProps) {
  return error instanceof ApiRequestError && error.status === 404 ? <NotFound /> : <RootError />;
}

export const Route = createFileRoute('/job-offers/$jobOfferId')({
  component: JobOfferScreen,
  errorComponent: JobOfferError,
});
