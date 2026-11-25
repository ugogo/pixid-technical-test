import type { components } from '@/shared/api/schema';

type Schemas = components['schemas'];

/** A refusal the mocked server answers with: its HTTP status and the swagger's error body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Schemas['Error'] | Schemas['ValidationError'],
  ) {
    super(body.message);
  }
}

export function notFound(jobOfferId: string) {
  return new ApiError(404, { code: 'NOT_FOUND', message: `Job offer not found: ${jobOfferId}` });
}

export function badRequest(message: string) {
  return new ApiError(400, { code: 'BAD_REQUEST', message });
}

export function validationFailed(fieldErrors: Schemas['ValidationError']['fieldErrors']) {
  return new ApiError(422, {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    fieldErrors,
  });
}
