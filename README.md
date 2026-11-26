# Job offers

A React 19 + MUI app to create job offers and move them through a company's publishing workflow. It runs against a mocked API built from [`job-offer-swagger.yml`](job-offer-swagger.yml): there is no backend to start.

[ARCHITECTURE.md](ARCHITECTURE.md) explains the domain, the code's layout, and the decisions behind it.

## Getting started

Requires **Node.js 22.12+** (`nvm use`) and **pnpm 10** (`corepack enable` installs the pinned version).

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:5173.

- The mock API starts with 30 offers in every status, and resets on reload.
- The app bar switches between French and English, and opens **Settings**, where the workflow's optional steps are turned on and off.

## Pages

| Route                  | Page                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `/job-offers`          | The list: filter, sort and paginate, all kept in the URL                |
| `/job-offers/:id`      | An offer, the workflow actions the API allows now, and its history      |
| `/job-offers/new`      | A three-step form: basic information, compensation, review              |
| `/job-offers/:id/edit` | The same form, for an offer in draft or to finalize                     |
| `/settings`            | The company's workflow settings: approval, partial save, manual posting |

## Tests

```bash
pnpm test
```

```bash
pnpm test:coverage
```

The suite renders each page as a user reaches it, against the same mock API as the browser, and checks every page, form step and dialog against WCAG 2.1 AA with axe. `test:coverage` also writes `coverage/index.html` and fails under 80 %.

The committed `coverage/` folder is a snapshot, as the brief asks. **CI** (`.github/workflows/ci.yml`) runs on every pull request: type-check, tests with coverage (each run's report is a downloadable artifact), lint and the axe checks.

## Scripts

| Command          | What it does                                                 |
| ---------------- | ------------------------------------------------------------ |
| `pnpm typecheck` | Type-checks the project                                      |
| `pnpm lint`      | Lints with oxlint: React, accessibility, layers, `useEffect` |
| `pnpm format`    | Formats with oxfmt (`format:check` only checks)              |
| `pnpm build`     | Type-checks, then builds into `dist/`                        |
| `pnpm api:types` | Regenerates the API types from the swagger                   |

## Key decisions

- **The server owns the workflow**: an offer's page shows the transitions the API lists; the app never works them out.
- **Types come from the swagger**: `openapi-typescript` and `openapi-react-query` type every request and query.
- **No global store**: the URL holds the list's state, TanStack Query the server's data, components the rest.
- **Layers**: `routes → screens → features → shared`, imports only going down, checked by the linter.
- **Forms**: react-hook-form and one zod schema mirroring the swagger; the server's 422 errors land on their field.
- **A readable mock**: MSW over an in-memory store that applies the swagger's workflow, with each gap in the swagger written down.
- **Bonus points**: English and French, skeletons, error pages, phone layout, automated WCAG 2.1 AA checks. No virtual scrolling: the API paginates.
