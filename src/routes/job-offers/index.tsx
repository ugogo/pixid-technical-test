import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import {
  DEFAULT_JOB_OFFER_LIST_SEARCH,
  jobOfferListSearchSchema,
  jobOfferQueries,
} from '@/features/job-offers';
import { JobOffersScreen } from '@/screens/job-offers/job-offers-screen';

export const Route = createFileRoute('/job-offers/')({
  validateSearch: jobOfferListSearchSchema,
  search: { middlewares: [stripSearchParams(DEFAULT_JOB_OFFER_LIST_SEARCH)] },
  // Starts the request without blocking, as the detail route does.
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(jobOfferQueries.list(deps));
  },
  component: JobOffersScreen,
});
