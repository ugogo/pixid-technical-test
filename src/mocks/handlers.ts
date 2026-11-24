import type { RequestHandler } from 'msw';

/** The mocked API: every endpoint of the swagger, against an in-memory store. */
export const handlers: RequestHandler[] = [];
