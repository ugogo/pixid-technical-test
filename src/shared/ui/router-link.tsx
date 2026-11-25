import { Button, Link } from '@mui/material';
import { createLink } from '@tanstack/react-router';

/** MUI's link, navigating through the router with typed routes and params. */
export const RouterLink = createLink(Link);

/** MUI's button, as a link to a typed route. */
export const RouterButton = createLink(Button);
