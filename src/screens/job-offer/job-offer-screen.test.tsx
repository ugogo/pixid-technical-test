import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import { server } from '@/mocks/node';
import { API_BASE_URL } from '@/shared/api/client';
import { renderRoute } from '@/test/render-route';
import { seededOfferId } from '@/test/seeded-offer-id';

async function renderOffer(title: string) {
  const view = await renderRoute(`/job-offers/${await seededOfferId(title)}`);

  await screen.findByRole('heading', { level: 1, name: new RegExp(title) });

  return { ...view, user: userEvent.setup() };
}

function historyEntries() {
  return within(screen.getByRole('list', { name: 'History' })).getAllByRole('listitem');
}

describe('JobOfferScreen', () => {
  test('shows the offer, its compensation and its history', async () => {
    await renderOffer('Aide-soignant');

    expect(screen.getByText('To approve')).toBeInTheDocument();
    expect(screen.getByText('€2,050.00 per month')).toBeInTheDocument();
    expect(screen.getByText('Nantes', { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(historyEntries()).toHaveLength(1));
    expect(historyEntries()[0]).toHaveTextContent('Draft → To approve');
  });

  test('runs a transition and shows where the offer went', async () => {
    const { user } = await renderOffer('Aide-soignant');

    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Status changed to To post.');
    expect(await screen.findByRole('button', { name: 'Post' })).toBeInTheDocument();
    await waitFor(() => expect(historyEntries()).toHaveLength(2));
  });

  test('asks for a reason before rejecting, and keeps it in the history', async () => {
    const { user } = await renderOffer('Serveur en brasserie');

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject?' });
    const confirm = within(dialog).getByRole('button', { name: 'Reject' });

    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'Salary too low');
    await user.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeInTheDocument();
    await waitFor(() => expect(historyEntries()[0]).toHaveTextContent('Reason: Salary too low'));
  });

  test('asks before withdrawing, and does nothing on cancel', async () => {
    const { user } = await renderOffer('Serveur en brasserie');

    await user.click(await screen.findByRole('button', { name: 'Withdraw to draft' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Withdraw to draft?' })).getByRole('button', {
        name: 'Cancel',
      }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('To approve')).toBeInTheDocument();
  });

  test('an incomplete offer cannot be finalized, and says why', async () => {
    await renderOffer('Peintre en bâtiment');

    expect(
      await screen.findByRole('button', { name: 'Finalize and submit for approval' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Add a salary or a bonus to this offer before finalizing it.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No salary or bonus yet.')).toBeInTheDocument();
  });

  test('deletes a draft and goes back to the list', async () => {
    const { user, router } = await renderOffer('Assistant de direction');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete this draft?' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/job-offers'));
    expect(await screen.findAllByRole('link', { name: /\(H\/F\)/ })).not.toHaveLength(0);
    expect(
      screen.queryByRole('link', { name: 'Assistant de direction (H/F)' }),
    ).not.toBeInTheDocument();
  });

  test('says when the server refuses a transition', async () => {
    const { user } = await renderOffer('Aide-soignant');

    server.use(
      http.post(`${API_BASE_URL}/job-offers/:jobOfferId/transitions/:action`, () =>
        HttpResponse.json({ code: 'INVALID_TRANSITION', message: 'Too late' }, { status: 400 }),
      ),
    );
    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This action is no longer available: the offer has changed. Reload to see it.',
    );
  });

  test('an unknown offer is a missing page', async () => {
    await renderRoute('/job-offers/00000000-0000-4000-8000-999999999999');

    expect(await screen.findByText('This page does not exist.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to job offers' })).toBeInTheDocument();
  });
});
