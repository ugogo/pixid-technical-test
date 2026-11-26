# Job offers

A React 19 + MUI app to create job offers and move them through a company's publishing workflow: draft, approval, posting, publication. It runs against a mocked API built from [`job-offer-swagger.yml`](job-offer-swagger.yml), so there is no backend to start.

[ARCHITECTURE.md](ARCHITECTURE.md) explains the domain in one minute, how the code is organised, and why.

## Prerequisites

- **Node.js 22.12 or later** (`nvm use` picks the version in `.nvmrc`).
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

- **The mock API** answers every request from the browser, through a service worker. It starts with 30 offers in every status, and resets when the page reloads.
- **The language switch** in the app bar toggles French and English.
- **Settings** in the app bar turns the workflow's optional steps on and off. A change applies to offers created afterwards, as the API specifies.

## Run the tests

```bash
pnpm test
```

```bash
pnpm test:coverage
```

The first runs the whole suite once. The second also writes an HTML report to `coverage/index.html`, and fails under 80 % coverage. The `coverage/` folder in the repository is that report.

**CI** (`.github/workflows/ci.yml`) runs on every pull request and on `main`, in two jobs:

- **Tests**: type-check, then the whole suite with the 80 % coverage gate.
- **Accessibility**: lint, `jsx-a11y` rules included, then the axe checks.

The tests render each page as a user reaches it, against the same mock API as the browser. Each page, form step and dialog is also checked against WCAG 2.1 AA with axe.

## Other scripts

| Command          | What it does                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `pnpm typecheck` | Type-checks the whole project                                       |
| `pnpm lint`      | Lints with oxlint, including the accessibility rules and the layers |
| `pnpm format`    | Formats with oxfmt; `pnpm format:check` only checks                 |
| `pnpm build`     | Type-checks, then builds into `dist/`                               |
| `pnpm preview`   | Serves the build                                                    |
| `pnpm api:types` | Regenerates the API types from the swagger                          |

## Pages

| Page       | Route                  | What it does                                                                    |
| ---------- | ---------------------- | ------------------------------------------------------------------------------- |
| Offer list | `/job-offers`          | Filter by title, city, status and creation date; sort; paginate. All in the URL |
| Offer      | `/job-offers/:id`      | The offer, the workflow actions the API allows now, and its status history      |
| New offer  | `/job-offers/new`      | A three-step form: basic information, compensation, review                      |
| Edit offer | `/job-offers/:id/edit` | The same form, for an offer in draft or to finalize                             |
| Settings   | `/settings`            | The company's workflow settings: approval, partial save, manual posting         |

## Key decisions

Each one is explained in [ARCHITECTURE.md](ARCHITECTURE.md).

- **The server owns the workflow.** An offer's page shows the transitions the API lists for it; the app never works out which ones are allowed.
- **Types come from the swagger.** `openapi-typescript` generates them, and `openapi-react-query` turns each endpoint into typed TanStack Query options and mutations. No request or response is typed by hand.
- **No global store.** The URL holds what must survive a reload (the list's filters, sort and page), TanStack Query holds the server's data, and components hold the rest.
- **Folders by layer, then by domain.** `routes/` map URLs to `screens/`, which assemble blocks from `features/` (job offers, company settings), which build on `shared/` (API client, UI pieces, i18n). Imports only go down, and the linter checks it.
- **Forms with react-hook-form and zod.** One schema mirrors the swagger's rules, and the server's 422 errors land on the field they name.
- **A mock API you can read.** MSW handlers over an in-memory store that applies the swagger's workflow, with every choice the swagger leaves open written down. The same handlers serve the browser and the tests.
- **Bonus points:** English and French, skeletons on first load, error pages inside the layout, a phone-width layout, and automated WCAG 2.1 AA checks. Virtual scrolling is left out: the API paginates the list.

## Known limitations

- The mock API always runs, including in `pnpm build`; pointing the app at a real API means removing it from `src/main.tsx` and setting the base URL.
- One company, hard-coded, stands in for the signed-in user's session.
- The server's validation messages show in English, as the API words them.
- No end-to-end tests: the page tests run against the mock API, as the browser does.

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

To read the code, start at `src/main.tsx`, then a route in `src/routes/`, its screen, and the feature it uses.
