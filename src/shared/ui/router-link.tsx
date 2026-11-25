import { Button, Link } from '@mui/material';
import { createLink } from '@tanstack/react-router';

/** MUI's link and button, navigating through the router with typed routes and params. */
export const RouterLink = createLink(Link);
export const RouterButton = createLink(Button);
