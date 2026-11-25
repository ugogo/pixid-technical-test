import { createFileRoute } from '@tanstack/react-router';

import { jobOfferQueries } from '@/features/job-offers';
import { JobOfferScreen } from '@/screens/job-offer/job-offer-screen';

export const Route = createFileRoute('/job-offers/$jobOfferId')({
  // Starts the requests on hover of a link, without blocking: the screen shows skeletons. It also
  // refetches a request that failed on an earlier visit, which `useQuery` alone would not retry.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(jobOfferQueries.detail(params.jobOfferId));
    void context.queryClient.prefetchQuery(jobOfferQueries.transitions(params.jobOfferId));
    void context.queryClient.prefetchQuery(jobOfferQueries.history(params.jobOfferId));
  },
  component: JobOfferScreen,
});
