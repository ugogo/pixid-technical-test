import type { ErrorComponentProps } from '@tanstack/react-router';

import { ApiRequestError } from '@/shared/api/api-request-error';

import { NotFound } from './not-found';
import { RootError } from './root-error';

/** A route's error: what the API does not know is a missing page, not a failure to retry. */
export function RouteError({ error }: ErrorComponentProps) {
  return error instanceof ApiRequestError && error.status === 404 ? <NotFound /> : <RootError />;
}
