import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import { server } from '@/mocks/node';
import { API_BASE_URL } from '@/shared/api/client';
import { CURRENT_COMPANY_ID } from '@/shared/api/current-company';
import { renderRoute } from '@/test/render-route';

async function renderNewOffer() {
  const view = await renderRoute('/job-offers/new');

  await screen.findByRole('textbox', { name: 'Title' });

  return { ...view, user: userEvent.setup() };
}

async function expectOfferOpened(router: Awaited<ReturnType<typeof renderNewOffer>>['router']) {
  await waitFor(() =>
    expect(router.state.location.pathname).toMatch(/^\/job-offers\/[0-9a-f-]{36}$/),
  );
}

describe('JobOfferNewScreen', () => {
  test('creates an offer through the three steps, then opens it', async () => {
    const { user, router } = await renderNewOffer();

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Boulanger (H/F)');
    await user.click(screen.getByRole('radio', { name: 'Another address' }));
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Nantes');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add a salary' }));
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '2100');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Boulanger (H/F)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('€2,100.00 per month')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create the offer' }));

    await expectOfferOpened(router);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Boulanger \(H\/F\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  test('stays on a step until its fields are valid', async () => {
    const { user } = await renderNewOffer();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Required.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Add a salary' })).not.toBeInTheDocument();
  });

  test('needs a salary or a bonus to go on, or saves early to finish later', async () => {
    const { user, router } = await renderNewOffer();

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Boulanger (H/F)');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Add a salary or a bonus, or save and finish later.',
    );

    await user.click(screen.getByRole('button', { name: 'Save and finish later' }));

    await expectOfferOpened(router);
    expect(await screen.findByText('To finalize')).toBeInTheDocument();
  });

  test('offers no early save when the company does not allow it', async () => {
    server.use(
      http.get(`${API_BASE_URL}/companies/:companyId/configuration`, () =>
        HttpResponse.json({
          companyId: CURRENT_COMPANY_ID,
          approvalRequired: true,
          partialSaveEnabled: false,
          manualPostingRequired: false,
        }),
      ),
    );
    await renderNewOffer();

    expect(screen.queryByRole('button', { name: 'Save and finish later' })).not.toBeInTheDocument();
  });

  test("shows the server's field error on its field, on its step", async () => {
    const { user } = await renderNewOffer();

    server.use(
      http.post(`${API_BASE_URL}/job-offers`, () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            fieldErrors: [{ field: 'title', message: 'must not contain HTML' }],
          },
          { status: 422 },
        ),
      ),
    );
    await user.type(screen.getByRole('textbox', { name: 'Title' }), '<b>Boulanger</b>');
    await user.click(screen.getByRole('button', { name: 'Save and finish later' }));

    expect(await screen.findByText('must not contain HTML')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
  });

  test("opens the compensation step for a server error on a field it doesn't show", async () => {
    const { user } = await renderNewOffer();

    server.use(
      http.post(`${API_BASE_URL}/job-offers`, () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            fieldErrors: [{ field: 'compensation[0].amount', message: 'must be at most 1000000' }],
          },
          { status: 422 },
        ),
      ),
    );
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Boulanger (H/F)');
    await user.click(screen.getByRole('button', { name: 'Save and finish later' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('must be at most 1000000');
    expect(screen.getByRole('button', { name: 'Add a salary' })).toBeInTheDocument();
  });

  test('says when saving fails, and keeps the values', async () => {
    const { user } = await renderNewOffer();

    server.use(http.post(`${API_BASE_URL}/job-offers`, () => HttpResponse.error()));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Boulanger (H/F)');
    await user.click(screen.getByRole('button', { name: 'Save and finish later' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The offer could not be saved. Check your connection and try again.',
    );
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Boulanger (H/F)');
  });
});
