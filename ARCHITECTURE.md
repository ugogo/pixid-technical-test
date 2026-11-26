# Architecture

This file explains how the app is built and why. [README.md](README.md) says how to run it.

The app covers every page of the brief: the offer list, an offer's page, the create and edit form, and the company's workflow settings. There is no backend: a mocked API, built from `job-offer-swagger.yml`, answers every request in the browser and in the tests.

## The domain in one minute

A job offer moves through a **workflow** of statuses. The server lists the moves allowed for each offer (its **transitions**); the app shows them as buttons and never works them out itself.

```
          submit              finalize             approve            post
DRAFT ─────────────▶ TO_FINALIZE ─────────▶ TO_APPROVE ─────────▶ TO_POST ─────────▶ PUBLISHED ──close──▶ CLOSED
  ▲   (incomplete offer,         (approval        │ reject            (manual          ▲  ◀──reopen───┘
  │    partial save on)           required)       │ (with a reason)    posting)        │
  └────────────── withdraw, from any status between DRAFT and PUBLISHED ◀──────────────┘
```

`reject` and `withdraw` send an offer back to `DRAFT`; `reopen` publishes a closed offer again.

Three company **settings** (`/settings`) decide which optional statuses an offer goes through:

| Setting                 | When on                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `partialSaveEnabled`    | An offer can be saved without a salary or a bonus; it then waits in `TO_FINALIZE`              |
| `approvalRequired`      | An offer waits in `TO_APPROVE` until approved or rejected (a rejection needs a reason)         |
| `manualPostingRequired` | An approved offer waits in `TO_POST` until someone posts it; otherwise it is published at once |

A status is skipped when its setting is off: with all three off, `submit` publishes a draft. An offer keeps the settings it was created with, so changing them affects new offers only.

An offer is **complete** when it has at least one salary or bonus. It can be edited in `DRAFT` and `TO_FINALIZE`, and deleted in `DRAFT`.

## Where to start reading

1. `src/main.tsx` starts the mock API and renders the app.
2. `src/routes/` maps each URL to a screen, e.g. `routes/job-offers/$jobOfferId.tsx`.
3. `src/screens/job-offer/job-offer-screen.tsx` assembles one page from feature blocks.
4. `src/features/job-offers/index.ts` lists what the job offers feature gives the screens.
5. `src/mocks/workflow.ts` is the workflow above, as one function.

## Stack

| Need            | Choice                                                         | Why                                                                                                  |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Build           | Vite + TypeScript (strict)                                     | Fast dev server; no framework the brief does not need                                                |
| UI              | MUI                                                            | Asked by the brief                                                                                   |
| Routing         | TanStack Router                                                | Typed routes and URL search params: the list's filters, sort and page live in the URL, validated     |
| Server state    | TanStack Query                                                 | Cache, loading and error states, refresh after a write                                               |
| API client      | `openapi-typescript` + `openapi-fetch` + `openapi-react-query` | Request and response types generated from the swagger; no request is typed by hand                   |
| Forms           | react-hook-form + zod                                          | Works with MUI inputs, and sets errors on nested fields, which showing the server's 422 errors needs |
| Mock API        | MSW                                                            | The same handlers answer in the browser and in the tests                                             |
| i18n            | react-i18next                                                  | French and English, switchable at runtime                                                            |
| Tests           | Vitest + Testing Library + MSW + axe                           | Same config as Vite; pages tested as a user uses them, against the mock                              |
| Lint and format | oxlint + oxfmt                                                 | Fast, one config each; oxlint also enforces the layers below                                         |

TanStack Form would match the rest of the TanStack suite; it is the first thing to try with more time.

There is no global store. The URL holds what must survive a reload or a shared link (the list's filters, sort and page), TanStack Query holds the server's data, and a component holds the rest.

## Layers

```
src/
├── app/                    the shell: router, providers, MUI theme, layout, error pages
├── routes/                 one file per URL: validates params, starts requests, names the screen
├── screens/                one folder per page, assembling feature blocks
│   ├── company-settings/
│   ├── job-offer/          an offer's page
│   ├── job-offer-edit/
│   ├── job-offer-new/
│   └── job-offers/         the list
├── features/               the blocks pages are built from, exported through each `index.ts`
│   ├── job-offers/         queries and mutations, list, details, transitions, the form
│   └── company-settings/   configuration query and save, the settings form
├── shared/
│   ├── api/                API client, generated types, enum values, API errors, the current company
│   ├── ui/                 small pieces over MUI: router links and buttons, a section, dialogs, a debounced field
│   ├── i18n/               setup, language switch, formatters, `en.json`, `fr.json`
│   ├── is-one-of.ts        narrows a value to one of a list
│   └── use-debounce.ts     calls back with a value once it stops changing
├── mocks/                  the mocked API: handlers, in-memory store, workflow, seed
└── test/                   test setup and helpers
```

- **Imports go down**: `screens → features → shared`. A screen imports a feature through its `index.ts` only, and a feature imports no other feature. `app/` and `routes/` are the shell above them. oxlint enforces this (`no-restricted-imports` in `.oxlintrc.json`), for aliased and relative paths alike. One gap is left: a file at a feature's top level could still reach another feature with `../other-feature/…`.
- **A screen owns its page**: its layout, its copy, which blocks it shows. It reads data through a feature's query options (`useQuery(jobOfferQueries.detail(id))`) and never builds a request itself.
- **`shared/` knows no page or feature**: `shared/api` speaks the API's vocabulary (its types, enums and error codes), but nothing in `shared/` is about one screen.
- **Screen folders are named entity first, verb last** (`job-offer-edit`, `job-offer-new`), so an entity's screens sort together.
- **The mock** is imported only by `main.tsx` (as its own chunk) and by the tests; oxlint refuses it everywhere else.

### Adding to the app

- **A page**: a file in `routes/` (TanStack Router generates the route tree from them), a folder in `screens/`, and the blocks it needs in a feature.
- **An endpoint**: update the swagger, run `pnpm api:types`, add its query options or mutation hook in the feature's `api/` folder, and its handler and store rule in `mocks/`.
- **A domain** (say, candidates): a `features/candidates/` folder with its own `index.ts`, and screens named `candidate-*`.
- **A translation**: the same key in `en.json` and `fr.json`. The type check fails when French misses one, and `translations.test.ts` when French has an extra one or loses a placeholder.

## Workflow and transitions

- An offer's page reads `GET /job-offers/{id}/transitions`. Each transition names its action, its target status, and whether it needs a reason.
- **Labels** depend on the action and its target: `transitions.submit.TO_APPROVE` is "Submit for approval", `transitions.submit.PUBLISHED` is "Publish".
- **A reason**: a transition with `requiresReason` (today, `reject`) opens a dialog for it.
- **A confirmation**: `withdraw` and `close` ask before running. That list is a UI choice, not the server's.
- **An incomplete offer**: `finalize` is disabled, with a link to the edit form.
- **The outcome** shows in a snackbar: where the offer went, or why the server refused. A refused dialog stays open with what the user typed.
- **Edit and Delete** are not transitions. The page shows them in the statuses the swagger allows; the server's 409 stays the authority.
- **A missing offer** (a 404) shows the same "page not found" as an unknown URL, not an error to retry.

## Data

- **Reads**: openapi-react-query turns the typed client into TanStack Query options, e.g. `$api.queryOptions('get', '/job-offers/{jobOfferId}', init)`. A screen passes them to `useQuery`. No query function is written by hand, and the response type comes from the swagger.
- **Query keys** are the library's own, `[method, path, init]`. A feature's query file is the one place that builds them. `jobOfferQueries.listsKey()` is `['get', '/job-offers']`, the start of every list's key, used to refresh all lists at once.
- **Routes start their requests**: a route's loader prefetches its screen's queries without waiting, so hovering a link starts loading the page, and the screen shows skeletons meanwhile. It also retries a request that failed on an earlier visit. Only the edit route waits, to redirect an offer that can no longer be edited.
- **Writes**: one mutation hook per endpoint. After a write, the app keeps the server's answer and refetches only what that answer does not contain:

| Write      | Then                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Transition | The returned offer replaces the cached one; its transitions, its history and the lists refetch. After a refusal, the offer too       |
| Create     | The returned offer is cached; the lists refetch                                                                                      |
| Update     | The returned offer replaces the cached one; its cached transitions are dropped, since they depend on completeness; the lists refetch |
| Delete     | The offer leaves the cache, so it is not refetched into a 404; the lists refetch                                                     |
| Settings   | The returned configuration replaces the cached one, which the new offer form reads                                                   |

- **Not optimistic**: a write changes several things at once (the offer, its transitions, its history, its place in a list), and the server can refuse it (409, 422). Waiting a few hundred milliseconds for the answer keeps the screen truthful.
- **Errors**: openapi-fetch returns an error status instead of throwing. A client middleware throws an `ApiRequestError` that keeps the status and the API's error body; code checks for it with `instanceof`.
- **Retries**: a query retries once after a network failure or a 5xx, never after a 4xx.
- **Company**: `X-Company-Id` comes from `CURRENT_COMPANY_ID` in `shared/api/`, which the client adds to every request. It stands in for the signed-in user's session; authentication is out of the brief's scope.
- **Types**: `pnpm api:types` regenerates `shared/api/schema.ts` from the swagger, with each enum as a list of values the UI and the mock iterate over (`shared/api/enums.ts`).

## Forms

The create and edit pages share `JobOfferForm` (`features/job-offers/form/`): three steps (basic information, compensation, review) over one react-hook-form form. The form only saves; the workflow's actions run from the offer's page.

### Who holds what

| State                         | Held by                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| The step on screen            | `JobOfferForm`'s state                                                                   |
| What the form is doing        | `JobOfferForm`'s `FormPhase`: editing, checking a step, saving, save failed, or conflict |
| Values and field errors       | react-hook-form; a hidden step's values survive                                          |
| The request and the cache     | The page's mutation: `onSave` runs it with the form's callbacks                          |
| Whether saving early is shown | On create, the company's `partialSaveEnabled`; on edit, always (see the mock's table)    |
| Create or edit                | An `offer` prop means edit, and its values fill the form                                 |
| Leaving with unsaved changes  | TanStack Router's `useBlocker`, which asks first                                         |
| An offer no longer editable   | The edit route's loader, which sends it back to its page                                 |

### The flow

```
basic information ──Next (step valid)──▶ compensation ──Next (valid, salary or bonus)──▶ review
        ◀─────────────────Back───────────────────┘   ◀──────────────Back──────────────────┘

Save and finish later (if allowed) ─▶ check, without the salary-or-bonus rule ─┐
Create / Save changes (on review) ──▶ check, all rules ────────────────────────┴─▶ invalid: the first step with an error
                                                                                   valid: send ─▶ saved: open the offer
                                                                                               ─▶ 422: the first step with an error
                                                                                               ─▶ 409: a message and a link, no more input
                                                                                               ─▶ other: same step, with a message
```

- **Plain React state**: the flow is linear, so `useState` holds it, next to the form. An XState machine was tried first; it repeated what react-hook-form and the mutation already track.
- **No double send, no lost edit**: while the form checks or saves, its fields and buttons are disabled. A save that lands after the user left keeps them where they went: the form's callbacks are `mutate`'s own, which TanStack Query skips once the page has unmounted.
- **Server errors**: a 422 error goes on the field it names, or at the top of its step when the form does not show that field (`compensation`, `location.address`). The server's messages show as it words them, in English; the client checks the same rules first, so they are rare.
- **Validation** runs when the user leaves a field (`onBlur`), not on every keystroke. Not `onTouched`, which checks a whole salary list, new empty row included, when a row is added. Moving to the next step focuses the first invalid field.

### Schema and request

- **One zod schema** (`jobOfferFormSchema`) mirrors the swagger's rules: title 1 to 200 characters, country `^[A-Z]{2}$`, currency `^[A-Z]{3}$`, amounts ≥ 0, an address when the location is `CUSTOM`. It leaves out the one rule saving early skips, that a complete offer needs a salary or a bonus; the form checks that one itself (`hasCompensation`).
- **Amounts** are kept as typed: an empty amount is missing, not 0. A decimal comma ("12,50", as French writes it) and spaces between thousands are read.
- **Location**: switching to the company address keeps the typed address, in case the user switches back; it is not sent.
- **Address lines** are one multiline field: at most 3 non-blank lines, trimmed when sent.

## List

- **The URL holds the list's state**, in the API's own terms: `page` from 0, `sort` as `-createdAt`, `status` as a list. A value the URL cannot hold falls back to its default, defaults stay out of the URL, and a page past the last one shows the last page.
- **Text and date filters** reach the URL 300 ms after the last keystroke, or as soon as the field loses focus. Each change is a history entry, so Back undoes it, and a filter change returns to the first page.
- **Dates**: "from" and "to" a day both include that whole day; the request asks for offers created before the day after "to" starts.
- **A company address** has no city in the list (the API returns `null`) and shows as "Company address".

## Settings

- **One form for the three flags** (`WorkflowSettingsForm`), each with what it does. Save is enabled once a flag changes. After saving, the form starts again from the server's answer.
- **The page says changes apply to new offers only**, as the swagger states; the mock keeps each offer on the settings it was created with.
- The configuration is one query, shared with the new offer form, so saving it is enough for that form to show or hide "Save and finish later".

## Mock API

MSW intercepts every request in the browser and in the tests. The mock is the swagger's executable reading: where the swagger is silent, the table below records the choice made, which a real backend would need to settle too.

| File                    | Holds                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| `workflow.ts`           | The workflow: the transitions a status allows under a set of settings           |
| `validation.ts`         | The swagger's field rules, reported under its JSON paths                        |
| `store.ts`              | Offers, history and configurations in memory, and the rules that change them    |
| `api-error.ts`          | The refusals, as an HTTP status and the swagger's error body                    |
| `seed.ts`               | 30 offers for the current company in every status, and 2 for another company    |
| `handlers.ts`           | The HTTP layer: query parsing, the company header, a delay, errors as responses |
| `browser.ts`, `node.ts` | The service worker for the browser, the server for the tests                    |

- Every response waits a realistic delay (100 to 400 ms in the browser, a few ms in the tests), so skeletons and pending states show.
- Refusals use the swagger's codes: 401 without `X-Company-Id`, 404 for another company's offer, 403 for its configuration, 409 `INVALID_STATE`, 400 `INVALID_TRANSITION` and `BAD_REQUEST`, 422 `VALIDATION_ERROR` and `INCOMPLETE_OFFER`.
- The seed builds each offer through the store's own operations, with a fixed clock and counted ids, so every run reads the same. The data resets when the page reloads, and after each test.

### Where the swagger is silent

| Question                         | The mock's answer                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What a complete offer needs      | A create needs a title and a location, and an update cannot remove them, so only compensation can be missing: at least one salary or bonus                                |
| Where an incomplete offer starts | With partial save, in `TO_FINALIZE`, as the create endpoint says; a complete offer starts in `DRAFT`. Without partial save, an incomplete offer is refused (422)          |
| What an incomplete offer can do  | `finalize` stays listed and answers `INCOMPLETE_OFFER`. An incomplete draft (after a withdraw) submits to `TO_FINALIZE`                                                   |
| Which statuses `withdraw` leaves | `TO_FINALIZE`, `TO_APPROVE`, `TO_POST` and `PUBLISHED`. `PUBLISHED` is the debatable one: it unpublishes an offer so it can be edited                                     |
| What an update replaces          | The fields its body carries; it never changes the status                                                                                                                  |
| Which settings an update follows | The offer's own, like its transitions. The API does not expose them, so the edit form always offers to save early, and shows the server's 422 when compensation is needed |
| The dates                        | `publishedAt` is set on the first publication and kept through close and reopen; a withdraw to `DRAFT` clears it and `closedAt`                                           |
| A company address's city         | `null`: the API does not expose the company's address, so the city filter only matches custom addresses                                                                   |
| A reject without a reason        | 422 `VALIDATION_ERROR` with an error on `reason`, the shape every other validation failure uses                                                                           |
| A "Created" entry in the history | None: the history endpoint records transitions, each from a status. The creation date shows in the offer's dates instead                                                  |

## Internationalization

- French and English, one JSON file per language. Keys are kebab-case and grouped by page and feature (`job-offers.list.title`); an API value keeps its own spelling (`status.TO_APPROVE`), so nothing maps between them.
- The language starts from the browser's, is saved in `localStorage`, and switches from the app bar.
- MUI's locales translate its own labels; `Intl` formats dates, amounts in their currency, and country names.

## Loading and errors

- A page shows a skeleton of its own layout while its data first loads; the list then keeps its rows while a filter or a page change loads.
- A request with no data yet that fails (a first load, or a new page of the list) shows the route's error page, inside the layout, with a retry. A failed refresh keeps the data on screen. Errors in the layout itself show the root error page.
- A failed write shows its message where it happened: on the field, at the top of the form's step, or in the snackbar for a transition.

## Accessibility and small screens

- **Checked by a tool**: `src/screens/accessibility.test.tsx` runs axe's WCAG 2.1 A and AA rules on every page once loaded, each form step and each dialog. Colour contrast cannot be measured in the test DOM; it was checked with axe in a browser on every page, and the theme darkens MUI's default primary, info and warning colours to reach 4.5:1 (`app/theme.ts`).
- **Lint**: oxlint's `jsx-a11y` rules run on every file.
- **In the markup**: every field has a label; a checkbox's description is linked to it; errors are announced by MUI's alerts; a step's first invalid field takes the focus; the form says "Step 1 of 3"; a link is marked as the current page only on its own page.
- **Phone width**: pages stack in one column, the app bar wraps, and the list's table scrolls sideways inside its card rather than widening the page.

## Tests

A behaviour is tested once, in the layer that owns it.

| Layer                                 | Proves                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| Plain functions (schema, list search) | Each rule's limits                                                                    |
| Mock store and handlers               | The workflow under each set of settings, since every page test relies on it           |
| Pages, through Testing Library + MSW  | What a user does: filter the list, fill the form and meet its errors, run transitions |
| Accessibility, through axe            | Every page, form step and dialog against WCAG 2.1 AA                                  |

There is no end-to-end suite: the page tests run against the same handlers as the browser. `pnpm test:coverage` writes `coverage/` for all of `src/` except generated files, the entry point and test helpers; the mock counts, since the pages depend on its rules. The run fails under 80 %.

## Conventions

- Names in full, after the domain thing they hold: a noun for a value, a verb and its object for a function, a state for a boolean.
- A file is named after its one component (`job-offer-form.tsx`, `JobOfferForm`).
- Return early: the empty or failed case first.
- No `as` type assertions; an awaited value goes into a named `const` before a `return` or an `if` reads it.
- A form holds its fields, their validation and its flow, and its page passes `onSave`, which runs the page's mutation with the form's callbacks. A button that runs one write (a transition, a delete) holds its own mutation, since nothing else needs its state.
- No `useEffect` by default: oxlint refuses importing it, and refuses React's default import so `React.useEffect` cannot get around it. Each layer of `.oxlintrc.json` repeats the ban, since an override replaces the base options; `src/test/oxlint-config.test.ts` keeps the copies identical. A value derives while rendering, an action runs in its event handler, a navigation renders `<Navigate>`, and data goes through the router and TanStack Query. An effect only syncs with an outside system: the one left is `useDebounce`'s timer, whose import disables the rule, with the reason. Where the ban is lifted, oxlint's `react/no-deriving-state-in-effects` and `react/set-state-in-effect` still refuse an effect that only keeps state in step.

## Trade-offs and next steps

- **The mock always runs**, in `pnpm dev`, `pnpm build` and `pnpm preview`. For a real API: drop the two lines in `main.tsx`, and read the base URL (`shared/api/client.ts`) from an environment variable.
- **One company**, hard-coded. With a real session, the company id would come from it, and switching company would clear the query cache.
- **Server messages are in English**, as the API words them.
- **No virtual scrolling**: the API paginates the list, at most 100 rows a page.
- **No end-to-end tests**, out of the brief's scope. The first to add: a Playwright run against a real backend.
- **CI** (`.github/workflows/ci.yml`) runs the tests (type-check, then the suite with its coverage gate) and the accessibility checks (lint with `jsx-a11y`, then axe) on every pull request. `format:check` and a build would be the next steps to add.
- **With more languages**, the translation files would split by feature.
