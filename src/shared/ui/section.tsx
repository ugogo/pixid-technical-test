import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

/** A titled block of a page, its title a small heading under the page's own. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack component="section" spacing={1}>
      <Typography component="h2" variant="overline">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}
