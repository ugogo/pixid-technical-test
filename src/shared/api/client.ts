import createClient from 'openapi-fetch';

import { CURRENT_COMPANY_ID } from './current-company';
import type { paths } from './schema';

export const API_BASE_URL = '/api/v1';

/**
 * The swagger marks `X-Company-Id` as required on every operation, so its generated types would
 * make each call pass it. The client sends it itself, so calls see the operations without it.
 */
type WithoutHeader<Operation> = Operation extends { parameters: infer Parameters }
  ? Omit<Operation, 'parameters'> & { parameters: Omit<Parameters, 'header'> }
  : Operation;

type ClientPaths = {
  [Path in keyof paths]: { [Method in keyof paths[Path]]: WithoutHeader<paths[Path][Method]> };
};

export const apiClient = createClient<ClientPaths>({
  baseUrl: API_BASE_URL,
  headers: { 'X-Company-Id': CURRENT_COMPANY_ID },
});
