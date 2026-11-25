import { createFileRoute } from '@tanstack/react-router';

import { companySettingsQueries } from '@/features/company-settings';
import { JobOfferNewScreen } from '@/screens/job-offer-new/job-offer-new-screen';

export const Route = createFileRoute('/job-offers/new')({
  // Whether saving early is offered comes from the configuration. The request starts on hover of
  // the link, without blocking: the screen shows a skeleton.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(companySettingsQueries.configuration());
  },
  component: JobOfferNewScreen,
});
