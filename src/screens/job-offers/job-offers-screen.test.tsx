import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import { server } from '@/mocks/node';
import { API_BASE_URL } from '@/shared/api/client';
import { renderRoute } from '@/test/render-route';

function dataRows() {
  const [, ...rows] = within(screen.getByRole('table')).getAllByRole('row');

  return rows;
}

async function waitForRows(count: number) {
  await waitFor(() => {
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false');
    expect(dataRows()).toHaveLength(count);
  });
}

describe('JobOffersScreen', () => {
  test('shows the first page, newest first', async () => {
    await renderRoute('/job-offers');

    await waitForRows(20);
    expect(dataRows()[0]).toHaveTextContent('Agent d’entretien (H/F)');
    expect(screen.getByText('Showing 1–20 of 30 · Page 1 of 2')).toBeInTheDocument();
  });

  test('a page past the last one shows the last page', async () => {
    const { router } = await renderRoute('/job-offers?page=5');

    await waitForRows(10);
    expect(screen.getByText('Showing 21–30 of 30 · Page 2 of 2')).toBeInTheDocument();
    expect(router.state.location.search).toMatchObject({ page: 1 });
  });

  test('a failed page keeps the app bar, and its retry loads it', async () => {
    server.use(
      http.get(`${API_BASE_URL}/job-offers`, () => new HttpResponse(null, { status: 503 })),
    );
    const { router } = await renderRoute('/job-offers');
    const user = userEvent.setup();

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitForRows(20);
    expect(router.state.location.pathname).toBe('/job-offers');
  });

  test('reads its filters from the URL', async () => {
    await renderRoute('/job-offers?status=%5B%22PUBLISHED%22%5D');

    await waitForRows(8);
    for (const row of dataRows()) {
      expect(within(row).getByText('Published')).toBeInTheDocument();
    }
  });

  test('searches the title once the user pauses typing, back on the first page', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute('/job-offers?page=1');

    await waitForRows(10);
    await user.type(screen.getByRole('searchbox', { name: 'Title' }), 'technicien');

    await waitForRows(3);
    expect(router.state.location.search).toEqual({ titleContains: 'technicien' });
  });

  test('filters by status', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute('/job-offers');

    await waitForRows(20);
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'To approve' }));
    await user.keyboard('{Escape}');

    await waitForRows(4);
    expect(router.state.location.search).toEqual({ status: ['TO_APPROVE'] });
  });

  test('sorts by a column, then flips it', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute('/job-offers?page=1');

    await waitForRows(10);
    await user.click(screen.getByRole('button', { name: 'Title' }));

    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: 'Title' })).toHaveAttribute(
        'aria-sort',
        'ascending',
      ),
    );
    expect(router.state.location.search).toEqual({ sort: 'title' });

    await user.click(screen.getByRole('button', { name: 'Title' }));

    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: 'Title' })).toHaveAttribute(
        'aria-sort',
        'descending',
      ),
    );
    expect(router.state.location.search).toEqual({ sort: '-title' });
  });

  test('pages through the offers', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute('/job-offers');

    await waitForRows(20);
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    await waitForRows(10);
    expect(screen.getByText('Showing 21–30 of 30 · Page 2 of 2')).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ page: 1 });
  });

  test('says when nothing matches, and clears the filters', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute('/job-offers?titleContains=%22astronaut%22');

    expect(await screen.findByText('No job offer matches these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitForRows(20);
    expect(router.state.location.search).toEqual({});
  });

  test('shows a company address instead of a city', async () => {
    await renderRoute('/job-offers?titleContains=%22fournisseurs%22');

    await waitForRows(1);
    expect(within(dataRows()[0]!).getByText('Company address')).toBeInTheDocument();
  });

  test('opens an offer from its title', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute('/job-offers');

    await waitForRows(20);
    await user.click(screen.getByRole('link', { name: 'Agent d’entretien (H/F)' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agent d’entretien (H/F)' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/job-offers\/[\w-]+$/);
  });

  test('a failed load shows an error with a retry', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API_BASE_URL}/job-offers`, () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Boom' }, { status: 500 }),
      ),
    );
    await renderRoute('/job-offers');

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitForRows(20);
  });
});
