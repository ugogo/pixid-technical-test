/** A response the API answered with an error status, kept with its body for the caller to read. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

/** Resolves to the response's data, or throws an `ApiRequestError` for Query to hold. */
export async function unwrap<Data>(
  pending: Promise<{ data?: Data; error?: unknown; response: Response }>,
): Promise<Data> {
  const { data, error, response } = await pending;

  if (!response.ok || data === undefined) throw new ApiRequestError(response.status, error);

  return data;
}
