import type { components } from '@/shared/api/schema';

type Schemas = components['schemas'];

export type CompanyConfiguration = Schemas['CompanyConfiguration'];
export type UpdateCompanyConfigurationRequest = Schemas['UpdateCompanyConfigurationRequest'];
