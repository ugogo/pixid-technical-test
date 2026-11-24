import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from '@/mocks/node';
import { i18n } from '@/shared/i18n/i18n';

beforeAll(async () => {
  server.listen({ onUnhandledFrame: 'error' });
  await i18n.changeLanguage('en');
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  await i18n.changeLanguage('en');
});

afterAll(() => server.close());
