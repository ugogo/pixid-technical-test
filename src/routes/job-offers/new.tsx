import { createFileRoute } from '@tanstack/react-router';

import { companySettingsQueries } from '@/features/company-settings';
import { JobOfferNewScreen } from '@/screens/job-offer-new/job-offer-new-screen';

export const Route = createFileRoute('/job-offers/new')({
  // Starts on hover of "New offer": whether saving early is offered comes from the configuration.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(companySettingsQueries.configuration()),
  component: JobOfferNewScreen,
});
