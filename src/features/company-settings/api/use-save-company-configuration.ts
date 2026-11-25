import { useQueryClient } from '@tanstack/react-query';

import { $api } from '@/shared/api/client';
import { CURRENT_COMPANY_ID } from '@/shared/api/current-company';

import type { UpdateCompanyConfigurationRequest } from '../company-configuration-types';
import { companySettingsQueries } from './company-settings-queries';

/**
 * Saves the current company's workflow flags and resolves with the saved configuration, which
 * also replaces the cached one.
 */
export function useSaveCompanyConfiguration() {
  const queryClient = useQueryClient();
  const updateConfiguration = $api.useMutation('put', '/companies/{companyId}/configuration', {
    onSuccess: (configuration) => {
      queryClient.setQueryData(companySettingsQueries.configuration().queryKey, configuration);
    },
  });

  return (body: UpdateCompanyConfigurationRequest) =>
    updateConfiguration.mutateAsync({ params: { path: { companyId: CURRENT_COMPANY_ID } }, body });
}
