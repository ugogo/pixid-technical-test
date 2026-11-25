import createClient from 'openapi-fetch';
import createQueryClient from 'openapi-react-query';

import { ApiRequestError } from './api-request-error';
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

// openapi-fetch resolves an error status instead of throwing. Throwing here, with the status,
// lets the retry rule tell a 404 from a network failure.
apiClient.use({
  async onResponse({ response }) {
    if (!response.ok) {
      throw new ApiRequestError(response.status, await response.json().catch(() => undefined));
    }
  },
});

/**
 * TanStack Query options and hooks typed from the swagger; their data is never `undefined`.
 * Their error type says the API's error body, but what they throw is the `ApiRequestError` above.
 */
export const $api = createQueryClient(apiClient);
