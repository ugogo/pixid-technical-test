# Job offers

A React 19 + MUI app to create job offers and move them through a company's publishing workflow (draft, approval, posting, publication). It runs against a mocked API built from [`job-offer-swagger.yml`](job-offer-swagger.yml), so there is no backend to start.

## Prerequisites

- **Node.js 22.12 or later** (`.nvmrc` holds the major version; `nvm use` picks it up).
- **pnpm 10**: `corepack enable` installs the version pinned in `package.json`.

## Install

```bash
pnpm install
```

## Run the app

```bash
pnpm dev
```

Then open the URL Vite prints (http://localhost:5173 by default).

- The mock API answers every request from the browser, through a service worker. It starts with 30 offers in every status, and resets when the page reloads.
- The language switch in the app bar toggles French and English.
- **Settings** in the app bar turns the workflow's optional steps on and off. A change applies to offers created afterwards, as the API specifies.

## Run the tests

```bash
pnpm test
```

```bash
pnpm test:coverage
```

The first runs the whole suite once. The second also writes an HTML report to `coverage/index.html`, and fails under 80 % coverage. The committed `coverage/` folder is that report.

The tests render each page as a user reaches it, against the same mock API the browser uses. Each page is also checked against WCAG 2.1 AA with axe.

## Other scripts

| Command          | What it does                                           |
| ---------------- | ------------------------------------------------------ |
| `pnpm typecheck` | Type-checks the whole project                          |
| `pnpm lint`      | Lints with oxlint (React, accessibility, Vitest rules) |
| `pnpm format`    | Formats with oxfmt; `pnpm format:check` only checks    |
| `pnpm build`     | Type-checks, then builds into `dist/`                  |
| `pnpm preview`   | Serves the build                                       |
| `pnpm api:types` | Regenerates the API types from the swagger             |

## What is in it

| Page       | Route                  | What it does                                                                    |
| ---------- | ---------------------- | ------------------------------------------------------------------------------- |
| Offer list | `/job-offers`          | Filter by title, city, status and creation date; sort; paginate. All in the URL |
| Offer      | `/job-offers/:id`      | The offer, the workflow actions the API allows now, and its status history      |
| New offer  | `/job-offers/new`      | A three-step form: basic information, compensation, review                      |
| Edit offer | `/job-offers/:id/edit` | The same form, for an offer in draft or to finalize                             |
| Settings   | `/settings`            | The company's workflow flags: approval, partial save, manual posting            |

## Key decisions

The reasoning behind each one is in [ARCHITECTURE.md](ARCHITECTURE.md).

- **The server owns the workflow.** The offer page shows the transitions the API lists for the offer; the app never recomputes which ones are allowed.
- **Types come from the swagger.** `openapi-typescript` generates them, and `openapi-react-query` turns each endpoint into typed TanStack Query options and mutations. No request or response is typed by hand.
- **No global store.** The URL holds what must survive a reload (list filters, sort, page), TanStack Query holds server data, and components hold the rest.
- **Folders by layer, then by domain.** `routes/` map URLs to `screens/`, which assemble blocks from `features/` (job offers, company settings), which build on `shared/` (API client, UI pieces, i18n). Imports only go down.
- **Forms with react-hook-form and zod.** One schema mirrors the swagger's constraints, and the server's 422 errors land on the field they name.
- **A mock API you can read.** MSW handlers over an in-memory store that applies the swagger's state machine. The same handlers serve the browser and the tests.
- **Bonus points covered:** English and French, skeletons on first load, error pages per route, a phone-width layout, and automated WCAG 2.1 AA checks. Virtual scrolling is left out: the API paginates the list.

## Project layout

```
src/
├── app/        the shell: router, providers, theme, layout, error pages
├── routes/     one file per URL (TanStack Router, file-based)
├── screens/    one folder per page
├── features/   job-offers/, company-settings/: the blocks pages are built from
├── shared/     API client and types, UI pieces, i18n
├── mocks/      the mocked API (MSW)
└── test/       test setup and helpers
```
