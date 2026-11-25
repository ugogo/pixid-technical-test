import { render } from '@testing-library/react';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';

import { AppProviders } from '@/app/app-providers';
import { createQueryClient } from '@/app/query-client';
import { createAppRouter } from '@/app/router';

/** Renders the whole app at `path`, with a fresh cache, as a user would land on it. */
export async function renderRoute(path: string) {
  const queryClient = createQueryClient();
  queryClient.setQueryDefaults([], { retryDelay: 0 });
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }));
  await router.load();

  return {
    ...render(
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
    router,
  };
}
