import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';

describe('AppLayout', () => {
  it('sends the root to the job offers', async () => {
    const { router } = await renderRoute('/');

    expect(router.state.location.pathname).toBe('/job-offers');
    expect(await screen.findByRole('heading', { name: 'Job offers' })).toBeTruthy();
  });

  it('switches the copy to French', async () => {
    await renderRoute('/job-offers');

    await userEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    await userEvent.click(screen.getByRole('option', { name: 'Français' }));

    expect(await screen.findByRole('heading', { name: "Offres d'emploi" })).toBeTruthy();
  });
});
