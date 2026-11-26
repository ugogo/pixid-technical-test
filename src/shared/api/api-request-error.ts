import { z } from 'zod';

/** The swagger's error codes the UI words itself; any other code gets the generic message. */
const KNOWN_ERROR_CODES = ['INVALID_TRANSITION', 'INVALID_STATE', 'INCOMPLETE_OFFER'] as const;

const errorBodySchema = z.object({ code: z.string() });
const validationErrorBodySchema = z.object({
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string() })),
});

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

  /** A 422's field errors, keyed by the swagger's JSON path (`compensation.salaryEntries[0].amount`). */
  get fieldErrors() {
    return validationErrorBodySchema.safeParse(this.body).data?.fieldErrors ?? [];
  }
}

/** The translation key that tells the user why a write failed. */
export function errorMessageKey(
  error: unknown,
): `errors.${(typeof KNOWN_ERROR_CODES)[number]}` | 'errors.generic' {
  const code = error instanceof ApiRequestError ? error.code : undefined;
  const knownCode = KNOWN_ERROR_CODES.find((knownErrorCode) => knownErrorCode === code);

  return knownCode ? `errors.${knownCode}` : 'errors.generic';
}
