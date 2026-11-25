import { createRootRouteWithContext } from '@tanstack/react-router';

import type { RouterContext } from '@/app/router';

import { AppLayout } from '@/app/app-layout';
import { NotFound } from '@/app/not-found';
import { RootError } from '@/app/root-error';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AppLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});
