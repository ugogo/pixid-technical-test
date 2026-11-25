import createClient from 'openapi-fetch';

import { CURRENT_COMPANY_ID } from './current-company';
import type { paths } from './schema';

export const API_BASE_URL = '/api/v1';

/**
 * The swagger's paths without `X-Company-Id`, which the client sends on every request,
 * so no call passes it; any other header stays as the swagger declares it.
 */
type WithoutCompanyHeader<Entry> = Entry extends { header: infer Header }
  ? Omit<Entry, 'header'> & { header?: Omit<Header, 'X-Company-Id'> }
  : Entry extends { parameters: unknown }
    ? Omit<Entry, 'parameters'> & { parameters: WithoutCompanyHeader<Entry['parameters']> }
    : Entry;

type ClientPaths = {
  [Path in keyof paths]: { [Key in keyof paths[Path]]: WithoutCompanyHeader<paths[Path][Key]> };
};

export const apiClient = createClient<ClientPaths>({
  baseUrl: API_BASE_URL,
  headers: { 'X-Company-Id': CURRENT_COMPANY_ID },
});
