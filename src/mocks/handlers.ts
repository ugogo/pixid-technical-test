import { delay, http, HttpResponse, type PathParams } from 'msw';

import { API_BASE_URL } from '@/shared/api/client';
import { JOB_OFFER_SORTS, JOB_OFFER_STATUSES } from '@/shared/api/enums';
import { isOneOf } from '@/shared/is-one-of';

import { ApiError, badRequest } from './api-error';
import { createSeededStore } from './seed';
import type { ListQuery } from './store';
import { isRecord } from './validation';

let store = createSeededStore();

/** Puts the seeded data back, so each test starts from the same offers. */
export function resetMockStore() {
  store = createSeededStore();
}

function invalidParameter(name: string, value: string) {
  return badRequest(`Invalid ${name} parameter: '${value}'`);
}

function integerParameter(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = params.get(name);

  if (value === null) return fallback;

  const number = Number(value);

  if (!Number.isInteger(number) || number < min || number > max)
    throw invalidParameter(name, value);

  return number;
}

function textParameter(params: URLSearchParams, name: string) {
  const value = params.get(name) ?? undefined;

  if (value !== undefined && value.length > 100) throw invalidParameter(name, value);

  return value;
}

function dateParameter(params: URLSearchParams, name: string) {
  const value = params.get(name);

  if (value === null) return undefined;
  if (Number.isNaN(Date.parse(value))) throw invalidParameter(name, value);

  return new Date(value).toISOString();
}

function parseListQuery(url: URL): ListQuery {
  const params = url.searchParams;
  const sortValue = params.get('sort') ?? '-createdAt';

  const statuses = params.getAll('status');
  const invalidStatus = statuses.find((status) => !isOneOf(JOB_OFFER_STATUSES, status));

  if (!isOneOf(JOB_OFFER_SORTS, sortValue)) throw invalidParameter('sort', sortValue);
  if (invalidStatus !== undefined) throw invalidParameter('status', invalidStatus);

  return {
    page: integerParameter(params, 'page', 0, 0, Number.MAX_SAFE_INTEGER),
    size: integerParameter(params, 'size', 20, 1, 100),
    sort: sortValue,
    status: JOB_OFFER_STATUSES.filter((status) => statuses.includes(status)),
    titleContains: textParameter(params, 'titleContains'),
    locationCity: textParameter(params, 'locationCity'),
    createdAfter: dateParameter(params, 'createdAfter'),
    createdBefore: dateParameter(params, 'createdBefore'),
  };
}

/** Reads a JSON body as an object; a missing body is empty, a malformed one is refused. */
async function readBody(request: Request, { required }: { required: boolean }) {
  const text = await request.text();

  if (text === '' && !required) return {};

  try {
    const body: unknown = JSON.parse(text);

    if (isRecord(body)) return body;
  } catch {
    // Refused below, as a body that is not an object.
  }

  throw badRequest('Request body must be a JSON object');
}

interface ResolverContext {
  companyId: string;
  request: Request;
  params: PathParams;
}

/**
 * Waits a realistic delay (a few milliseconds under Node), requires the company header,
 * and turns the store's refusals into the swagger's error responses.
 */
function endpoint(resolve: (context: ResolverContext) => Response | Promise<Response>) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    await delay();

    const companyId = request.headers.get('X-Company-Id');

    if (!companyId) {
      return HttpResponse.json(
        { code: 'UNAUTHORIZED', message: 'Missing required header: X-Company-Id' },
        { status: 401 },
      );
    }

    try {
      // Awaited inside `try`, so a rejected `ApiError` is caught below.
      const response = await resolve({ companyId, request, params });

      return response;
    } catch (error) {
      if (error instanceof ApiError) return HttpResponse.json(error.body, { status: error.status });

      throw error;
    }
  };
}

const jobOffers = `${API_BASE_URL}/job-offers`;
const jobOffer = `${jobOffers}/:jobOfferId`;
const configuration = `${API_BASE_URL}/companies/:companyId/configuration`;

/** The mocked API: every endpoint of the swagger, against an in-memory store. */
export const handlers = [
  http.get(
    jobOffers,
    endpoint(({ companyId, request }) =>
      HttpResponse.json(store.listJobOffers(companyId, parseListQuery(new URL(request.url)))),
    ),
  ),
  http.post(
    jobOffers,
    endpoint(async ({ companyId, request }) => {
      const offer = store.createJobOffer(companyId, await readBody(request, { required: true }));

      return HttpResponse.json(offer, {
        status: 201,
        headers: { Location: `${jobOffers}/${offer.id}` },
      });
    }),
  ),
  http.get(
    jobOffer,
    endpoint(({ companyId, params }) =>
      HttpResponse.json(store.getJobOffer(companyId, String(params.jobOfferId))),
    ),
  ),
  http.put(
    jobOffer,
    endpoint(async ({ companyId, request, params }) =>
      HttpResponse.json(
        store.updateJobOffer(
          companyId,
          String(params.jobOfferId),
          await readBody(request, { required: true }),
        ),
      ),
    ),
  ),
  http.delete(
    jobOffer,
    endpoint(({ companyId, params }) => {
      store.deleteJobOffer(companyId, String(params.jobOfferId));

      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.get(
    `${jobOffer}/transitions`,
    endpoint(({ companyId, params }) =>
      HttpResponse.json(store.getTransitions(companyId, String(params.jobOfferId))),
    ),
  ),
  http.post(
    `${jobOffer}/transitions/:action`,
    endpoint(async ({ companyId, request, params }) =>
      HttpResponse.json(
        store.transitionJobOffer(
          companyId,
          String(params.jobOfferId),
          String(params.action),
          await readBody(request, { required: false }),
        ),
      ),
    ),
  ),
  http.get(
    `${jobOffer}/history`,
    endpoint(({ companyId, params }) =>
      HttpResponse.json(store.getHistory(companyId, String(params.jobOfferId))),
    ),
  ),
  http.get(
    configuration,
    endpoint(({ companyId, params }) =>
      HttpResponse.json(store.getConfiguration(companyId, String(params.companyId))),
    ),
  ),
  http.put(
    configuration,
    endpoint(async ({ companyId, request, params }) =>
      HttpResponse.json(
        store.updateConfiguration(
          companyId,
          String(params.companyId),
          await readBody(request, { required: true }),
        ),
      ),
    ),
  ),
];
