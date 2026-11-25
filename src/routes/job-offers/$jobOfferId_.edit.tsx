import { createFileRoute, redirect } from '@tanstack/react-router';

import { isEditable, jobOfferQueries } from '@/features/job-offers';
import { JobOfferEditScreen } from '@/screens/job-offer-edit/job-offer-edit-screen';

// `$jobOfferId_` keeps the edit page out of the detail's layout: it replaces the detail.
export const Route = createFileRoute('/job-offers/$jobOfferId_/edit')({
  /** An offer past `TO_FINALIZE` can no longer be edited: its detail says what it can do. */
  loader: async ({ context, params }) => {
    const offer = await context.queryClient.ensureQueryData(
      jobOfferQueries.detail(params.jobOfferId),
    );

    if (!isEditable(offer)) {
      throw redirect({ to: '/job-offers/$jobOfferId', params, replace: true });
    }
  },
  component: JobOfferEditScreen,
});
