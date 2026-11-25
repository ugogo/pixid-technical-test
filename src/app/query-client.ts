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
        // A failed first load goes to the route's error boundary; a failed refetch keeps its data.
        throwOnError: (_error, query) => query.state.data === undefined,
      },
    },
  });
}
