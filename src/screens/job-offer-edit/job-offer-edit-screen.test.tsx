import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import { server } from '@/mocks/node';
import { API_BASE_URL } from '@/shared/api/client';
import { renderRoute } from '@/test/render-route';
import { seededOfferId } from '@/test/seeded-offer-id';

async function renderEdit(title: string) {
  const jobOfferId = await seededOfferId(title);
  const view = await renderRoute(`/job-offers/${jobOfferId}/edit`);

  return { ...view, jobOfferId, user: userEvent.setup() };
}

describe('JobOfferEditScreen', () => {
  test("starts from the offer's values and saves the changes", async () => {
    const { user, router, jobOfferId } = await renderEdit('Assistant de direction');
    const title = await screen.findByRole('textbox', { name: 'Title' });

    expect(title).toHaveValue('Assistant de direction (H/F)');

    await user.clear(title);
    await user.type(title, 'Assistant de direction senior (H/F)');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('textbox', { name: 'Amount' })).toHaveValue('2600');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/job-offers/${jobOfferId}`));
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Assistant de direction senior/ }),
    ).toBeInTheDocument();
  });

  test('after a save, the offer shows the transitions of its new content, not the old ones', async () => {
    const jobOfferId = await seededOfferId('Comptable fournisseurs');
    const { router } = await renderRoute(`/job-offers/${jobOfferId}`);
    const user = userEvent.setup();

    // An incomplete draft under partial save can only be saved as incomplete.
    expect(await screen.findByRole('button', { name: 'Save as incomplete' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Edit' }));
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add a salary' }));
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '2100');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/job-offers/${jobOfferId}`));
    expect(screen.queryByRole('button', { name: 'Save as incomplete' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Submit for approval' })).toBeInTheDocument();
  });

  test('sends an offer past TO_FINALIZE back to its detail', async () => {
    const { router, jobOfferId } = await renderEdit('Aide-soignant');

    await waitFor(() => expect(router.state.location.pathname).toBe(`/job-offers/${jobOfferId}`));
  });

  test('says when the offer can no longer be edited', async () => {
    const { user } = await renderEdit('Assistant de direction');

    server.use(
      http.put(`${API_BASE_URL}/job-offers/:jobOfferId`, () =>
        HttpResponse.json(
          { code: 'INVALID_STATE', message: 'Cannot update job offer in TO_APPROVE status' },
          { status: 409 },
        ),
      ),
    );
    await user.click(await screen.findByRole('button', { name: 'Save and finish later' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This offer can no longer be edited: its status has changed.',
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('asks before leaving with unsaved changes', async () => {
    const { user, router, jobOfferId } = await renderEdit('Assistant de direction');

    await user.type(await screen.findByRole('textbox', { name: 'Title' }), ' senior');
    await user.click(screen.getByRole('link', { name: 'Open the offer' }));

    const leaveDialog = await screen.findByRole('dialog', { name: 'Leave without saving?' });

    expect(router.state.location.pathname).toBe(`/job-offers/${jobOfferId}/edit`);
    await user.click(within(leaveDialog).getByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/job-offers/${jobOfferId}`));
  });
});
