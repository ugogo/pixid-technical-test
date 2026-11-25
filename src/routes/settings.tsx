import { createFileRoute } from '@tanstack/react-router';

import { companySettingsQueries } from '@/features/company-settings';
import { CompanySettingsScreen } from '@/screens/company-settings/company-settings-screen';

export const Route = createFileRoute('/settings')({
  // Starts the request on hover of the link, without blocking: the screen shows a skeleton.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(companySettingsQueries.configuration());
  },
  component: CompanySettingsScreen,
});
