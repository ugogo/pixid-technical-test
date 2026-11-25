/** A response the API answered with an error status, kept with its body for the caller to read. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

/**
 * Turns an openapi-fetch result into what TanStack Query expects from a query function.
 *
 * openapi-fetch never throws on an error status: it resolves `{ data, error, response }`, with
 * `data` undefined on a 4xx or 5xx. Returning that `data` would hand Query `undefined`, which it
 * rejects with a generic error that has lost the status and the API's error body, so the retry
 * rule could not tell a 404 from a network failure. `unwrap` throws an `ApiRequestError` with
 * both instead, and returns `data` typed as present, so a query's data is never `T | undefined`.
 */
export async function unwrap<Data>(
  pending: Promise<{ data?: Data; error?: unknown; response: Response }>,
): Promise<Data> {
  const { data, error, response } = await pending;

  if (!response.ok || data === undefined) throw new ApiRequestError(response.status, error);

  return data;
}
