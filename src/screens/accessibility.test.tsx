import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test } from 'vitest';

import { expectAccessible } from '@/test/expect-accessible';
import { renderRoute } from '@/test/render-route';
import { seededOfferId } from '@/test/seeded-offer-id';

/** Each page once its data has loaded, and its dialogs, checked against WCAG 2.1 AA by axe. */
describe('accessibility', () => {
  test('the list', async () => {
    await renderRoute('/job-offers');

    await screen.findAllByRole('link', { name: /\(H\/F\)/ });
    await expectAccessible();
  });

  test('an offer, and its reason dialog', async () => {
    await renderRoute(`/job-offers/${await seededOfferId('Serveur en brasserie')}`);
    const user = userEvent.setup();

    await screen.findByRole('list', { name: 'History' });
    await expectAccessible();

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await expectAccessible(await screen.findByRole('dialog', { name: 'Reject?' }));
  });

  test('a draft, and its delete dialog', async () => {
    await renderRoute(`/job-offers/${await seededOfferId('Assistant de direction')}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await expectAccessible(await screen.findByRole('dialog', { name: 'Delete this draft?' }));
  });

  test('each step of the new offer form', async () => {
    await renderRoute('/job-offers/new');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Boulanger (H/F)');
    await user.click(screen.getByRole('radio', { name: 'Another address' }));
    await expectAccessible();

    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Nantes');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add a salary' }));
    await user.click(screen.getByRole('button', { name: 'Add a bonus' }));
    await expectAccessible();

    const [salaryAmount, bonusAmount] = screen.getAllByRole('textbox', { name: 'Amount' });

    if (salaryAmount && bonusAmount) {
      await user.type(salaryAmount, '2100');
      await user.type(bonusAmount, '500');
    }
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('button', { name: 'Create the offer' });
    await expectAccessible();
  });

  test('the edit form, and its leave dialog', async () => {
    await renderRoute(`/job-offers/${await seededOfferId('Assistant de direction')}/edit`);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Title' }), ' senior');
    await expectAccessible();

    await user.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'Settings' }),
    );
    await expectAccessible(await screen.findByRole('dialog', { name: 'Leave without saving?' }));
  });

  test('the settings', async () => {
    await renderRoute('/settings');

    await screen.findByRole('checkbox', { name: 'Require approval' });
    await expectAccessible();
  });

  test('a missing page', async () => {
    await renderRoute('/nowhere');

    await screen.findByText('This page does not exist.');
    await expectAccessible();
  });
});
