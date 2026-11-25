import { QueryClient } from '@tanstack/react-query';

import { ApiRequestError } from '@/shared/api/api-request-error';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 4xx answers the same the second time; a network failure or a 5xx may not.
        retry: (failureCount, error) =>
          failureCount < 1 && !(error instanceof ApiRequestError && error.status < 500),
        staleTime: 30_000,
        // A request with no data yet (a first load, or a new page or filter of the list) that fails
        // goes to the route's error boundary; a failed refetch keeps the data on screen.
        throwOnError: (_error, query) => query.state.data === undefined,
      },
    },
  });
}
