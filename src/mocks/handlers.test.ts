import { describe, expect, test } from 'vitest';

import { apiClient, API_BASE_URL } from '@/shared/api/client';
import { CURRENT_COMPANY_ID } from '@/shared/api/current-company';

import { OTHER_COMPANY_ID } from './seed';

const header = { 'X-Company-Id': CURRENT_COMPANY_ID };

describe('mocked API', () => {
  test('the seed covers every status for the current company', async () => {
    const { data } = await apiClient.GET('/job-offers', {
      params: { header, query: { size: 100 } },
    });

    expect(data?.totalElements).toBe(30);
    expect(new Set(data?.content.map((offer) => offer.status))).toEqual(
      new Set(['DRAFT', 'TO_FINALIZE', 'TO_APPROVE', 'TO_POST', 'PUBLISHED', 'CLOSED']),
    );
  });

  test('every seeded offer agrees with its history', async () => {
    const { data } = await apiClient.GET('/job-offers', {
      params: { header, query: { size: 100 } },
    });

    for (const offer of data?.content ?? []) {
      const { data: history = [] } = await apiClient.GET('/job-offers/{jobOfferId}/history', {
        params: { header, path: { jobOfferId: offer.id } },
      });
      const initialStatus = history[0]?.fromStatus ?? offer.status;

      expect(['DRAFT', 'TO_FINALIZE']).toContain(initialStatus);
      expect(history.at(-1)?.toStatus ?? offer.status).toBe(offer.status);
    }
  });

  test('filters by several statuses', async () => {
    const { data } = await apiClient.GET('/job-offers', {
      params: { header, query: { status: ['TO_APPROVE', 'TO_POST'], size: 100 } },
    });

    expect(data?.content.every((offer) => ['TO_APPROVE', 'TO_POST'].includes(offer.status))).toBe(
      true,
    );
    expect(data?.totalElements).toBe(7);
  });

  test('an invalid query parameter is refused', async () => {
    const { error, response } = await apiClient.GET('/job-offers', {
      params: { header, query: { size: 500 } },
    });

    expect(response.status).toBe(400);
    expect(error).toEqual({ code: 'BAD_REQUEST', message: "Invalid size parameter: '500'" });
  });

  test('a request without the company header is unauthorized', async () => {
    const response = await fetch(`${API_BASE_URL}/job-offers`);

    expect(response.status).toBe(401);
  });

  test('create answers 201 with the offer location', async () => {
    const { data, response } = await apiClient.POST('/job-offers', {
      params: { header },
      body: { title: 'Cariste (H/F)', location: { type: 'COMPANY_ADDRESS' } },
    });

    expect(response.status).toBe(201);
    expect(data?.status).toBe('TO_FINALIZE');
    expect(response.headers.get('Location')).toBe(`${API_BASE_URL}/job-offers/${data?.id}`);
  });

  test('a transition with an empty body is accepted', async () => {
    const { data: created } = await apiClient.POST('/job-offers', {
      params: { header },
      body: {
        title: 'Cariste (H/F)',
        location: { type: 'COMPANY_ADDRESS' },
        compensation: { salaryEntries: [{ type: 'HOURLY', amount: 12.5, currency: 'EUR' }] },
      },
    });
    const { data } = await apiClient.POST('/job-offers/{jobOfferId}/transitions/{action}', {
      params: { header, path: { jobOfferId: created?.id ?? '', action: 'submit' } },
    });

    expect(data?.status).toBe('TO_APPROVE');
  });

  test('the store is reset between tests', async () => {
    const { data } = await apiClient.GET('/job-offers', { params: { header, query: { size: 1 } } });

    expect(data?.totalElements).toBe(30);
  });

  test("another company's configuration is forbidden", async () => {
    const { response } = await apiClient.GET('/companies/{companyId}/configuration', {
      params: { header, path: { companyId: OTHER_COMPANY_ID } },
    });

    expect(response.status).toBe(403);
  });
});
