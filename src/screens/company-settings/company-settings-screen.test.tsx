import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import { server } from '@/mocks/node';
import { API_BASE_URL } from '@/shared/api/client';
import { renderRoute } from '@/test/render-route';

async function renderSettings() {
  const view = await renderRoute('/settings');

  await screen.findByRole('checkbox', { name: 'Require approval' });

  return { ...view, user: userEvent.setup() };
}

describe('CompanySettingsScreen', () => {
  test("shows the company's flags, each with what it does", async () => {
    await renderSettings();

    expect(screen.getByRole('checkbox', { name: 'Require approval' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Allow partial save' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Manual posting' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Manual posting' })).toHaveAccessibleDescription(
      'Manually control when offers go live.',
    );
    expect(screen.getByText('Changes apply to new offers only.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  test('saves a change, and new offers follow it', async () => {
    const { user, router } = await renderSettings();

    await user.click(screen.getByRole('checkbox', { name: 'Allow partial save' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await router.navigate({ to: '/job-offers/new' });

    expect(await screen.findByRole('textbox', { name: 'Title' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and finish later' })).not.toBeInTheDocument();
  });

  test('says when saving fails, and keeps the change', async () => {
    const { user } = await renderSettings();

    server.use(
      http.put(`${API_BASE_URL}/companies/:companyId/configuration`, () => HttpResponse.error()),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Manual posting' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('The settings could not be saved. Try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Manual posting' })).toBeChecked();
  });

  test('is reachable from the app bar', async () => {
    const { router } = await renderRoute('/job-offers');
    const user = userEvent.setup();

    await user.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'Settings' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workflow settings' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/settings');
  });
});
