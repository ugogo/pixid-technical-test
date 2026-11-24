import type { QueryClient } from '@tanstack/react-query';

import { createRouter, type RouterHistory } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

export interface RouterContext {
  queryClient: QueryClient;
}

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    context: { queryClient },
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
