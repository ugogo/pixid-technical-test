import { createFileRoute } from '@tanstack/react-router';

import { JobOfferNewScreen } from '@/screens/job-offer-new/job-offer-new-screen';

export const Route = createFileRoute('/job-offers/new')({
  component: JobOfferNewScreen,
});
