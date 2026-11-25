import { z } from 'zod';

/** The swagger's error codes the UI words itself; any other code gets the generic message. */
const KNOWN_ERROR_CODES = ['INVALID_TRANSITION', 'INVALID_STATE', 'INCOMPLETE_OFFER'] as const;

const errorBodySchema = z.object({ code: z.string() });

/** A response the API answered with an error status, kept with its body for the caller to read. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }

  /** The swagger's machine-readable error code (`INVALID_STATE`, `INCOMPLETE_OFFER`…), if any. */
  get code(): string | undefined {
    return errorBodySchema.safeParse(this.body).data?.code;
  }
}

/** The translation key that tells the user why a write failed. */
export function errorMessageKey(
  error: Error,
): `errors.${(typeof KNOWN_ERROR_CODES)[number]}` | 'errors.generic' {
  const code = error instanceof ApiRequestError ? error.code : undefined;
  const knownCode = KNOWN_ERROR_CODES.find((candidate) => candidate === code);

  return knownCode ? `errors.${knownCode}` : 'errors.generic';
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

/** For a response with no body, such as a 204: throws an `ApiRequestError` on an error status. */
export async function ensureOk(pending: Promise<{ error?: unknown; response: Response }>) {
  const { error, response } = await pending;

  if (!response.ok) throw new ApiRequestError(response.status, error);
}
