import { Button, Link } from '@mui/material';
import { createLink, type LinkComponent } from '@tanstack/react-router';

// A link is "the current page" (`aria-current="page"`) only on its own path: by default the router
// also marks links to a parent path, such as "Back to job offers" on an offer's page.
const EXACT_PATH = { exact: true, includeSearch: false };

const MuiRouterLink = createLink(Link);
const MuiRouterButton = createLink(Button);

/** MUI's link, navigating through the router with typed routes and params. */
export const RouterLink: LinkComponent<typeof Link> = (props) => (
  <MuiRouterLink activeOptions={EXACT_PATH} {...props} />
);

/** MUI's button, as a link to a typed route. */
export const RouterButton: LinkComponent<typeof Button> = (props) => (
  <MuiRouterButton activeOptions={EXACT_PATH} {...props} />
);
