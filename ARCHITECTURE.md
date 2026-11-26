# Architecture

How the app is built, and why. [README.md](README.md) says how to run it.

## The domain in one minute

A job offer moves through a **workflow** of statuses. The server lists the moves each offer allows (its **transitions**); the app shows them as buttons and never works them out.

```
          submit              finalize             approve            post
DRAFT ─────────────▶ TO_FINALIZE ─────────▶ TO_APPROVE ─────────▶ TO_POST ─────────▶ PUBLISHED ──close──▶ CLOSED
  ▲   (incomplete offer,         (approval        │ reject            (manual          ▲  ◀──reopen───┘
  │    partial save on)           required)       │ (with a reason)    posting)        │
  └────────────── withdraw, from any status between DRAFT and PUBLISHED ◀──────────────┘
```

`reject` and `withdraw` send an offer back to `DRAFT`; `reopen` publishes a closed one again.

Three company **settings** decide which optional statuses an offer goes through; with all three off, `submit` publishes a draft. An offer keeps the settings it was created with.

| Setting                 | When on                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `partialSaveEnabled`    | An offer without a salary or a bonus can be saved; it waits in `TO_FINALIZE` |
| `approvalRequired`      | An offer waits in `TO_APPROVE` until approved or rejected                    |
| `manualPostingRequired` | An approved offer waits in `TO_POST` until posted                            |

An offer is **complete** with at least one salary or bonus. It can be edited in `DRAFT` and `TO_FINALIZE`, and deleted in `DRAFT`.

## Stack

| Need            | Choice                                                         | Why                                                                    |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Build           | Vite + TypeScript (strict)                                     | Fast; nothing heavier than the brief needs                             |
| Routing         | TanStack Router                                                | Typed routes and validated URL search params                           |
| Server state    | TanStack Query                                                 | Cache, loading and error states, refresh after a write                 |
| API client      | `openapi-typescript` + `openapi-fetch` + `openapi-react-query` | Types and query options generated from the swagger                     |
| Forms           | react-hook-form + zod                                          | MUI inputs, and errors set on nested fields, as the server's 422s need |
| Mock API        | MSW                                                            | One set of handlers for the browser and the tests                      |
| i18n            | react-i18next                                                  | French and English, switched at runtime                                |
| Tests           | Vitest + Testing Library + MSW + axe                           | Pages tested as a user uses them                                       |
| Lint and format | oxlint + oxfmt                                                 | Fast; oxlint also enforces the layers and the `useEffect` rule         |

There is no global store: the URL holds the list's filters, sort and page, TanStack Query the server's data, and components the rest. TanStack Form would match the suite; it is the first thing to try with more time.

## Layers

```
src/
├── app/        the shell: router, providers, theme, layout, error pages
├── routes/     one file per URL: validates params, starts requests, names the screen
├── screens/    one folder per page, assembling feature blocks
├── features/   job-offers/, company-settings/: queries, mutations and components, each exported by an index.ts
├── shared/     API client and types, UI pieces over MUI, i18n, small helpers (useDebounce, isOneOf)
├── mocks/      the mocked API: handlers, in-memory store, workflow, seed
└── test/       test setup and helpers
```

- **Imports go down**: `screens → features → shared`. A screen imports a feature only through its `index.ts`; a feature imports no other feature; only `main.tsx` and the tests import the mock. oxlint enforces it, for aliased and relative paths (one gap: `../other-feature/` from a feature's top level).
- **A screen owns its page** (layout, copy, which blocks show) and reads data through a feature's query options, never building a request.
- **Screen folders are named entity first** (`job-offer-edit`, `job-offer-new`), so an entity's screens sort together.
- **Start reading at** `main.tsx`, then a route, its screen, and the feature's `index.ts`. `mocks/workflow.ts` is the workflow above, as one function.
- **To add a page**: a route file, a screen folder, and its blocks in a feature. **An endpoint**: update the swagger, run `pnpm api:types`, add its query or mutation in the feature, and its handler in `mocks/`.

## Data

- **Reads**: `openapi-react-query` turns each endpoint into query options (`$api.queryOptions('get', '/job-offers/{jobOfferId}', init)`) that a screen passes to `useQuery`. Keys are the library's own, `[method, path, init]`; `jobOfferQueries.listsKey()` is the start of every list's key.
- **Routes prefetch** their screen's queries without waiting, so hovering a link starts loading, the screen shows skeletons, and a request that failed on an earlier visit runs again. Only the edit route waits, to redirect an offer that can no longer be edited.
- **Writes** keep the server's answer and refetch only what it does not contain. They are not optimistic: the server can refuse a write (409, 422), and waiting a few hundred milliseconds keeps the screen truthful.

| Write      | Then                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Transition | Caches the returned offer; refetches its transitions, history and the lists (and the offer, after a refusal) |
| Create     | Caches the returned offer; refetches the lists                                                               |
| Update     | Caches the returned offer; drops its transitions, which depend on completeness; refetches the lists          |
| Delete     | Drops the offer, so it is not refetched into a 404; refetches the lists                                      |
| Settings   | Caches the returned configuration, which the new offer form reads                                            |

- **Errors**: a client middleware throws an `ApiRequestError` (status and error body) for any error status. A query retries once after a network failure or a 5xx, never after a 4xx.
- **Company**: `X-Company-Id` comes from `CURRENT_COMPANY_ID`, a stand-in for the signed-in user's session.

## Workflow and transitions

- An offer's page reads its transitions: action, target status, and whether a reason is needed (today, `reject`).
- **Labels** depend on the target: `submit` to `TO_APPROVE` is "Submit for approval", to `PUBLISHED` "Publish".
- `withdraw` and `close` ask for confirmation, a UI choice. `finalize` is disabled on an incomplete offer, with a link to the edit form.
- **The outcome** shows in a snackbar. A refused dialog stays open with what was typed and the error.
- **Edit and Delete** are not transitions: they show in the statuses the swagger allows, and the server's 409 stays the authority.
- A missing offer (404) shows "page not found", not an error to retry.

## Forms

The create and edit pages share `JobOfferForm`: three steps (basic information, compensation, review) over one react-hook-form form. Its flow is plain `useState`: the step on screen and a `FormPhase` (editing, checking, sending, save failed, conflict). An XState machine was tried first; it repeated what react-hook-form and the mutation already track.

```
basic information ──Next──▶ compensation ──Next (salary or bonus)──▶ review
Save and finish later (if allowed) ─▶ check, without the salary-or-bonus rule ─┐
Create / Save changes (on review) ──▶ check, all rules ────────────────────────┴─▶ invalid: the first step with an error
                                                                                   valid: send ─▶ saved: open the offer
                                                                                               ─▶ 422: the first step with an error
                                                                                               ─▶ 409: a message, no more input
                                                                                               ─▶ other: same step, with a message
```

- **Saving early** is offered on create when the company allows partial save, and always on edit: the API does not expose the offer's own settings, so the server's 422 decides.
- **While sending**, fields and buttons are disabled. The page's `onSave` runs its mutation with the form's callbacks; TanStack Query skips them once the page has unmounted, so a user who left during a save stays where they went.
- **Leaving** a changed form asks first (TanStack Router's `useBlocker`).
- **Validation** runs when a field loses focus (`onBlur`; `onTouched` would flag a new empty salary row at once). Next focuses the first invalid field. A server 422 lands on its field, or at the top of its step for one the form does not show; its message stays in English, as the API words it.
- **The schema** (`jobOfferFormSchema`) mirrors the swagger's rules, except that a complete offer needs a salary or a bonus, which the form checks itself so saving early can skip it. Amounts read a decimal comma; an empty one is missing, not 0. Address lines are one multiline field, at most 3 non-blank lines.

## List and settings

- **The list's state lives in the URL**, in the API's terms (`page` from 0, `sort` as `-createdAt`). Invalid values fall back to their default, defaults stay out of the URL, and a page past the last shows the last.
- **Text and date filters** apply 300 ms after the last keystroke, or when the field loses focus. Each change is a history entry; a filter change returns to the first page. A date range includes both of its days.
- **Settings** is one form for the three flags. Save is enabled once a flag changes, and the page says changes apply to new offers only. The configuration query is shared with the new offer form, which offers to save early or not accordingly.

## Mock API

MSW answers every request, in the browser and in the tests. Every response waits a realistic delay (100 to 400 ms in the browser), refusals use the swagger's codes, and the seed builds 30 offers through the store's own operations with a fixed clock, so every run reads the same. The data resets on reload and after each test.

| File            | Holds                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| `workflow.ts`   | The transitions a status allows under a set of settings                      |
| `validation.ts` | The swagger's field rules, reported under its JSON paths                     |
| `store.ts`      | Offers, history and configurations in memory, and the rules that change them |
| `handlers.ts`   | The HTTP layer: query parsing, the company header, the delay, errors         |
| `seed.ts`       | 30 offers for the current company, 2 for another                             |

Where the swagger is silent, the mock had to choose; a real backend would need to settle the same questions:

| Question                         | The mock's answer                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| What a complete offer needs      | At least one salary or bonus (a title and a location are always required)                        |
| Where an incomplete offer starts | `TO_FINALIZE` with partial save; otherwise it is refused (422). A complete one starts in `DRAFT` |
| What an incomplete offer can do  | `finalize` stays listed and answers `INCOMPLETE_OFFER`                                           |
| What `withdraw` leaves           | `TO_FINALIZE` to `PUBLISHED`; from `PUBLISHED` it unpublishes, the debatable case                |
| What an update changes           | The fields its body carries, never the status, under the offer's own settings                    |
| The dates                        | `publishedAt` is kept through close and reopen; a withdraw clears it and `closedAt`              |
| A company address's city         | `null`: the API does not expose the company's address                                            |
| A reject without a reason        | 422 `VALIDATION_ERROR` on `reason`, like every other validation failure                          |
| A "Created" history entry        | None: the history records transitions; the creation date shows with the offer's dates            |

## Internationalization

French and English, one JSON file each, starting from the browser's language and saved in `localStorage`. Keys are kebab-case, grouped by page; an API value keeps its spelling (`status.TO_APPROVE`). The type check fails when French misses a key, and `translations.test.ts` when it has an extra one or loses a placeholder. MUI's locales and `Intl` (dates, money, country names) follow the language.

## Loading, errors, accessibility

- A page shows a skeleton of its layout while its data first loads; the list keeps its rows while a filter loads.
- A first load that fails shows the route's error page, inside the layout, with a retry; a failed refresh keeps the data on screen. A failed write shows its message where it happened.
- **Accessibility** is checked by tools: axe's WCAG 2.1 AA rules on every page, form step and dialog (`src/screens/accessibility.test.tsx`), and oxlint's `jsx-a11y` rules. Contrast, which the test DOM cannot measure, was checked with axe in a browser; the theme darkens three MUI colours to reach 4.5:1.
- **On a phone**, pages stack, the app bar wraps, and the list's table scrolls inside its card.

## Tests

A behaviour is tested once, in the layer that owns it: plain functions (schema, list search) for each rule's limits, the mock store for the workflow under each set of settings, and pages through Testing Library for what a user does. There is no end-to-end suite: the page tests use the same handlers as the browser. Coverage counts all of `src/` except generated files, the entry point and test helpers, and fails under 80 %. CI runs it all on every pull request.

## Conventions

- Names in full, after the domain thing they hold. A file is named after its one component.
- Return early. No `as` type assertions; an awaited value goes into a named `const` before a `return` or an `if`.
- A form holds its fields, validation and flow, and its page passes `onSave`. A button that runs one write (a transition, a delete) holds its own mutation.
- **No `useEffect`** unless it syncs with an outside system: oxlint refuses importing it (and React's default import, which would get around it). A value derives while rendering, an action runs in its handler, a redirect renders `<Navigate>`, data goes through the router and TanStack Query. The one effect left is `useDebounce`'s timer, whose import disables the rule with the reason. Each layer of `.oxlintrc.json` repeats the ban, since an override replaces the base options; `oxlint-config.test.ts` keeps the copies identical.

## Trade-offs and next steps

- **The mock always runs**, builds included. For a real API: drop its two lines in `main.tsx`, and read the base URL from an environment variable.
- **One hard-coded company.** A real session would provide it, and switching company would clear the query cache.
- **No virtual scrolling**: the API pages the list, 100 rows at most.
- **Next**: end-to-end tests against a real backend, and `format:check` and a build in CI.
