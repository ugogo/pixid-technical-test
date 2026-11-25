import { createFileRoute } from '@tanstack/react-router';

import { JobOfferScreen } from '@/screens/job-offer/job-offer-screen';

export const Route = createFileRoute('/job-offers/$jobOfferId')({
  component: JobOfferScreen,
});
