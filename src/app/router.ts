import type { QueryClient } from '@tanstack/react-query';

import { createRouter, type RouterHistory } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

import { RouteError } from './route-error';

export interface RouterContext {
  queryClient: QueryClient;
}

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    context: { queryClient },
    // Inside the layout, so the app bar stays usable; the root route keeps its own for the layout.
    defaultErrorComponent: RouteError,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    history,
    routeTree,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
