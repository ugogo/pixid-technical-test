import { useQueryClient } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';

import { companySettingsQueries } from './company-settings-queries';

/** Saves the company's workflow flags; the answer replaces the cached configuration. */
export function useUpdateCompanyConfiguration() {
  const queryClient = useQueryClient();

  return $api.useMutation('put', '/companies/{companyId}/configuration', {
    onSuccess: (configuration) => {
      queryClient.setQueryData(companySettingsQueries.configuration().queryKey, configuration);
    },
  });
}
