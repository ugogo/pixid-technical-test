import createClient from 'openapi-fetch';

import { CURRENT_COMPANY_ID } from './current-company';
import type { paths } from './schema';

export const API_BASE_URL = '/api/v1';

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  headers: { 'X-Company-Id': CURRENT_COMPANY_ID },
});
