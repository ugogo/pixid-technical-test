import { $api } from '@/shared/api/client';
import { CURRENT_COMPANY_ID } from '@/shared/api/current-company';

/** The company's reads, as options a screen passes to `useQuery`. */
export const companySettingsQueries = {
  configuration: () =>
    $api.queryOptions('get', '/companies/{companyId}/configuration', {
      params: { path: { companyId: CURRENT_COMPANY_ID } },
    }),
};
