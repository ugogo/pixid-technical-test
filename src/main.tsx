import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from '@/app/app-providers';
import { createQueryClient } from '@/app/query-client';
import { createAppRouter } from '@/app/router';
import '@/shared/i18n/i18n';

// No backend exists: the mocked API serves every environment. Imported on its own, it is a separate
// chunk: pointing the app at a real API means dropping these two lines.
const { worker } = await import('@/mocks/browser');
await worker.start({ onUnhandledFrame: 'bypass', quiet: true });

const queryClient = createQueryClient();
const router = createAppRouter(queryClient);
const root = document.getElementById('root');

if (!root) {
  throw new Error('The #root element is missing from index.html');
}

createRoot(root).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
