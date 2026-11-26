import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe's WCAG 2.1 A and AA rules and fails on any violation. By default it checks the whole
 * document, so what MUI renders outside the page's container is checked too. Colour contrast is
 * left out: the test DOM (happy-dom) lays nothing out, so axe cannot measure it.
 *
 * Pass an open dialog to check it alone: behind a modal, MUI hides the page with `aria-hidden` and
 * traps the focus in the dialog, a trap axe cannot see, so it would report the page's buttons.
 */
export async function expectAccessible(root: Element = document.body) {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  const violations = results.violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );

  expect(violations).toEqual([]);
}
