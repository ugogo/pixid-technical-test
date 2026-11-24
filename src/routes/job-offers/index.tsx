import { createFileRoute } from '@tanstack/react-router';

import { JobOffersScreen } from '@/screens/job-offers/job-offers-screen';

export const Route = createFileRoute('/job-offers/')({
  component: JobOffersScreen,
});
