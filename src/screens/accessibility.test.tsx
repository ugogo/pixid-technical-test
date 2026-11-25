import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test } from 'vitest';

import { expectAccessible } from '@/test/expect-accessible';
import { renderRoute } from '@/test/render-route';
import { seededOfferId } from '@/test/seeded-offer-id';

/** Each page once it has loaded, checked against WCAG 2.1 AA by axe. */
describe('accessibility', () => {
  test('the list', async () => {
    const { container } = await renderRoute('/job-offers');

    await screen.findAllByRole('row');
    await expectAccessible(container);
  });

  test('an offer', async () => {
    const { container } = await renderRoute(`/job-offers/${await seededOfferId('Aide-soignant')}`);

    await screen.findByRole('button', { name: 'Approve' });
    await expectAccessible(container);
  });

  test('each step of the new offer form', async () => {
    const { container } = await renderRoute('/job-offers/new');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Boulanger (H/F)');
    await user.click(screen.getByRole('radio', { name: 'Another address' }));
    await expectAccessible(container);

    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Nantes');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add a salary' }));
    await user.click(screen.getByRole('button', { name: 'Add a bonus' }));
    await expectAccessible(container);

    await user.type(screen.getAllByRole('textbox', { name: 'Amount' })[0]!, '2100');
    await user.type(screen.getAllByRole('textbox', { name: 'Amount' })[1]!, '500');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('button', { name: 'Create the offer' });
    await expectAccessible(container);
  });

  test('the settings', async () => {
    const { container } = await renderRoute('/settings');

    await screen.findByRole('checkbox', { name: 'Require approval' });
    await expectAccessible(container);
  });

  test('a missing page', async () => {
    const { container } = await renderRoute('/nowhere');

    await screen.findByText('This page does not exist.');
    await expectAccessible(container);
  });
});
