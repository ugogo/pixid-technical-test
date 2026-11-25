import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe's WCAG 2.1 A and AA rules on what is rendered, and fails on any violation. Colour
 * contrast is left out: the test DOM (happy-dom) lays nothing out, so axe cannot measure it.
 */
export async function expectAccessible(container: Element) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  const violations = results.violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );

  expect(violations).toEqual([]);
}
