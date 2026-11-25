# Architecture

A React 19 + MUI app to manage job offers through a per-company workflow, against a mocked API built from `job-offer-swagger.yml`.

**Built so far**: the scaffold, the mock API and the list. The sections marked _planned_ describe the target for the detail, form and settings screens, and change as they land.

## Stack

| Need            | Choice                                 | Why                                                                                                                                                                                     |
| --------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build           | Vite + TypeScript (strict)             | Fast dev server, no framework the brief does not need                                                                                                                                   |
| UI              | MUI                                    | Imposed by the brief                                                                                                                                                                    |
| Routing         | TanStack Router                        | Typed routes and search params: filters, sort and page live in the URL, validated; routes are code-split                                                                                |
| Server state    | TanStack Query                         | Cache, loading and error states, invalidation after a write                                                                                                                             |
| API client      | `openapi-typescript` + `openapi-fetch` | Types generated from the swagger; a dozen hooks written by hand stay readable                                                                                                           |
| Forms           | react-hook-form + zod                  | Mature MUI integration (`Controller`) and `setError` on nested paths, which the 422 mapping relies on. TanStack Form would match the suite; it is the first thing to try with more time |
| Form flow       | XState v5                              | Steps, saving and failures as explicit states: an impossible combination cannot exist                                                                                                   |
| Mock API        | MSW                                    | The same handlers serve the browser and the tests                                                                                                                                       |
| i18n            | react-i18next                          | French and English, switchable at runtime                                                                                                                                               |
| Tests           | Vitest + Testing Library + MSW         | Same config as Vite; screens tested against the real handlers                                                                                                                           |
| Lint and format | oxlint + oxfmt                         | Fast, one config each; oxlint runs the React, jsx-a11y and Vitest plugins                                                                                                               |

No global store: the URL holds the UI state that must survive a reload or a shared link, Query holds the server state, and a component holds the rest.

## Layers

`app/` and `routes/` form the shell; below them, imports go one way: `screens → features → shared`. A layer does not import from one above it. Nothing enforces this but review.

```
src/
├── app/                    router, providers, MUI theme, root error boundary, layout
├── routes/                 a route validates its params and passes one screen as `component`
├── screens/                one folder per page; a screen assembles feature blocks
│   ├── job-offer/          detail
│   ├── job-offer-edit/
│   ├── job-offer-new/
│   ├── job-offers/         list
│   └── settings/
├── features/               blocks the screens build with, exported through `index.ts`
│   ├── job-offers/         API hooks, StatusChip, TransitionActions, JobOfferForm, form schema
│   └── company-settings/   API hooks, WorkflowSettingsForm
├── shared/
│   ├── api/                openapi-fetch client, generated types and enum values
│   ├── ui/                 presentational pieces over MUI (page layout, skeletons)
│   ├── i18n/               setup, language switcher, `fr.json`, `en.json`
│   ├── is-one-of.ts        narrows a value to one of a list
│   └── use-debounce.ts     a value once it stops changing
├── mocks/                  MSW: handlers, in-memory store, seed; only `main.tsx` and the tests import it
└── test/                   test setup and render helpers
```

- **A screen is named entity first, then its verb** (`job-offer-edit`, `job-offer-new`): an entity's screens sort together.
- **A screen owns its page**: its layout, its copy, which blocks it shows. It holds no API call of its own.
- **A feature exports blocks, never a page**: a screen imports `@/features/job-offers`, never a file inside it.
- **`shared/` holds no domain logic**: the generated API types and the translation files name job offers, but no component or function in it does.

## Data

- **Query keys**: one `as const` factory per feature, nested so one invalidation reaches everything below it. No key is written inline.

  ```ts
  jobOfferKeys.all; // ['job-offers']
  jobOfferKeys.lists(); // ['job-offers', 'list']
  jobOfferKeys.list(filters); // ['job-offers', 'list', filters]
  jobOfferKeys.detail(id); // ['job-offers', 'detail', id]
  jobOfferKeys.transitions(id); // ['job-offers', 'detail', id, 'transitions']
  jobOfferKeys.history(id); // ['job-offers', 'detail', id, 'history']
  companySettingsKeys.configuration(companyId);
  ```

- **Reads**: one Query hook per endpoint, keyed through the factory. The list keeps the previous page on screen while the next one loads (`placeholderData: keepPreviousData`).
- **Writes** _(planned)_: a mutation hook per endpoint. A transition or an update invalidates `detail(id)` (the offer, its transitions and its history) and `lists()`. A delete removes `detail(id)` from the cache instead, so a mounted detail does not refetch a 404, and invalidates `lists()`. A create invalidates `lists()`.
- **Not optimistic**: a write changes several queries at once (the offer, its transitions, its history, its place in the list) and the server can refuse it (409, 422). Waiting for the answer keeps the screen truthful for a delay of a few hundred milliseconds.
- **Retries and failures**: a query retries once on a network failure or a 5xx, never on a 4xx. A failed first load throws to the route's error boundary; a failed refetch keeps the data on screen.
- **Company**: `X-Company-Id` comes from `CURRENT_COMPANY_ID`, a const in `shared/api/` that the client sets on every request; the client's types leave the header out of each call. It stands in for the signed-in user's session, which would provide it in a real project; auth is out of scope.
- **Types**: `pnpm api:types` regenerates `shared/api/schema.ts` from the swagger, with each enum as a list of values (`--enum-values`) that the UI and the mock iterate through `shared/api/enums.ts`. Nothing is hand-typed for the wire.

## Workflow and transitions _(planned)_

The server decides which transitions exist; the UI never recomputes the state machine.

- The detail screen reads `GET /job-offers/{id}/transitions`: each transition names its action, its target status and whether it needs a reason.
- **Labels** are keyed on the action and its target, since an action can lead to different statuses: `submit` to `TO_APPROVE` is "Submit for approval", `submit` to `PUBLISHED` is "Publish". A key without a target (`transitions.withdraw`) covers an action that always lands in the same status.
- **Reason**: a transition with `requiresReason` opens a dialog for it (today, `reject`).
- **Confirmation**: `withdraw` and `close` ask before running. That list is a UI choice, not the server's.
- **Completeness**: while `isComplete` is false, `finalize` is disabled, with a link to the edit screen.
- Edit and Delete are not transitions. The UI shows them in the statuses the swagger allows (Edit in `DRAFT` and `TO_FINALIZE`, Delete in `DRAFT`); the server's 409 stays the authority.

## Forms _(planned)_

The create and edit screens share `JobOfferForm`: three steps (basic information, compensation, review) over one `useForm`, driven by one XState machine. The form only saves; the workflow's actions run from the detail screen.

### Who holds what

Each piece of state has one owner; nothing is copied into a `useState`.

| State                                       | Owner                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The flow: step, validating, saving, failure | `jobOfferFormMachine`                                                                                                                                   |
| Values and field errors                     | react-hook-form; a hidden step's fields stay registered, so their values survive                                                                        |
| The request and the cache invalidation      | The screen's mutation, passed to the form as an async `onSave`                                                                                          |
| Whether saving early is offered             | On create, the company's `partialSaveEnabled`, read by the screen; on edit, always, since the offer's own workflow is not exposed (see the table below) |
| Create or edit                              | Props: an `offer` means edit, and `defaultValues` come from `toJobOfferFormValues(offer)`; without one, empty values                                    |
| Leaving with unsaved changes                | TanStack Router's `useBlocker`, while the form is dirty and the machine is not in `saved`                                                               |
| An offer no longer editable                 | The edit route's loader, which sends it back to its detail                                                                                              |

The component starts the machine with `machine.provide`: `validateStep` wraps react-hook-form's `trigger`, `save` wraps `onSave`. The machine knows neither react-hook-form nor the API.

### The machine

```
editing
 ├── basicInfo ──NEXT──▶ validating ──valid──▶ compensation ──NEXT──▶ validating ──valid──▶ review
 │      ◀──────────────────BACK─────────────────────┘      ◀────────────BACK──────────────┘
 ├── SAVE_EARLY [canSaveEarly] ──▶ validating (draft rules) ──valid──▶ saving
 └── SAVE (from review) ─────────▶ validating (all rules) ────valid──▶ saving

saving ──done──────▶ saved: navigate to the detail
       ──422───────▶ editing.basicInfo | editing.compensation, the first step holding an error
       ──409───────▶ conflict: a message and a link to the detail, no more input
       ──network───▶ editing.<same step>, with a message
```

- **Validation is a state**: XState computes a transition synchronously, so a guard is a plain predicate. `validating` invokes `validateStep` as a promise actor instead.
- **No double send**: `saving` accepts no event.
- **A 422 picks its step** through one guarded transition per step, in step order, so the user lands where the first error is.
- **A 422 without a field** to attach to (`compensation`, `location.address`) shows in an error slot at the top of its step.
- **Server messages** show as the server words them, in English: the client validates the same rules first, so a 422 is rare.

### Schema and request

- **One schema**, built from the swagger's constraints (title 1 to 200 chars, country `^[A-Z]{2}$`, currency `^[A-Z]{3}$`, amounts ≥ 0, address required when location is `CUSTOM`). Saving early checks every field that is filled, salary rows included; it skips only the rule that a complete offer needs at least one salary or bonus entry.
- **Location**: a union on `location.type`. Switching to `COMPANY_ADDRESS` keeps the typed address in the values, in case the user switches back; `toJobOfferRequest` drops it when sending.
- **Validation mode**: `onTouched`, so no error shows before the user leaves a field.

## List

- **Search params mirror the API's query** (`page` from 0, `sort` as `-createdAt`, `status` as a list), validated by a zod schema on the route. Two exceptions: `createdFrom` and `createdTo` hold days, not instants. A value the URL cannot hold falls back to its default, and defaults stay out of the URL.
- **Text filters** (title, city) reach the URL 300 ms after the last keystroke. Each filter, sort or page change is a history entry, so Back undoes it, and a filter change returns to the first page.
- **Dates**: a "from" day becomes `createdAfter` at its start (inclusive); a "to" day becomes `createdBefore` at the start of the next day (exclusive), so the "to" day is included.
- **A company address** has no city in the list (`locationCity` is `null`) and shows as "Company address".

## Mock API

MSW intercepts every call in the browser and in the tests; there is no backend to run.

| File                    | Holds                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `workflow.ts`           | The state machine: the transitions a status allows under a workflow, as one function |
| `validation.ts`         | The swagger's field constraints, reported under its JSON paths                       |
| `store.ts`              | Offers, history and configurations in memory, and the rules that change them         |
| `api-error.ts`          | The refusals the store throws, as an HTTP status and the swagger's error body        |
| `seed.ts`               | 30 offers for the current company, 2 for another one                                 |
| `handlers.ts`           | The HTTP layer: query parsing, the company header, the delay, errors as responses    |
| `browser.ts`, `node.ts` | The worker for the browser, the server for the tests                                 |

- Each offer keeps the workflow configuration it was created with: a configuration change applies to new offers only, as the swagger states.
- Every response waits MSW's realistic `delay()` (100 to 400 ms in the browser, a few ms under Node), so skeletons and pending states show.
- Refusals use the swagger's codes: 401 without `X-Company-Id`, 404 for another company's offer, 403 for its configuration, 409 `INVALID_STATE`, 400 `INVALID_TRANSITION` and `BAD_REQUEST`, 422 `VALIDATION_ERROR` and `INCOMPLETE_OFFER`.
- The seed walks each offer through the store's own operations under a fixed clock and fixed ids, so its statuses, dates and history agree and every run reads the same. The store resets on a page reload, and after each test.

### Swagger ambiguities and how the mock resolves them

The swagger leaves some behaviours unstated. A mock must answer one way, so the table records each reading; a real backend may differ, and the UI follows what the API returns.

| Ambiguity                            | Resolution                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What a complete offer needs          | A create needs a title and a location, and an update cannot remove them, so only compensation can be missing: at least one salary or bonus entry                                                                                            |
| Where an incomplete offer starts     | With partial save, in `TO_FINALIZE`, as the create endpoint says; a complete offer starts in `DRAFT`. Without partial save, an incomplete body is a 422. An offer in `TO_FINALIZE` cannot be deleted until it is withdrawn to `DRAFT`       |
| What an incomplete offer can do      | `finalize` stays listed and answers `INCOMPLETE_OFFER`. `submit` never does: an incomplete draft only exists under partial save (after a withdraw), and goes to `TO_FINALIZE`                                                               |
| Which states `withdraw` leaves       | `TO_FINALIZE`, `TO_APPROVE`, `TO_POST` and `PUBLISHED`. `PUBLISHED` is the debatable one: it unpublishes an offer so it can be edited                                                                                                       |
| What an update replaces              | The fields its body carries, since every field of the update body is optional; it never changes the status                                                                                                                                  |
| Which partial save an update follows | The offer's own workflow, like its transitions: a draft created without partial save still needs compensation, whatever the company's current setting. The API does not expose it, so the edit form always offers to save and shows the 422 |
| The dates                            | `publishedAt` is set on the first publication and kept through close and reopen; a withdraw back to `DRAFT` clears it and `closedAt`                                                                                                        |
| `locationCity` for a company address | `null`: the API does not expose the company's address, so the city filter only matches custom addresses                                                                                                                                     |
| A reject without a reason            | 422 `VALIDATION_ERROR` with a field error on `reason`, the shape every other validation failure uses, though the transition's 422 declares the plain `Error` shape                                                                          |

## Internationalization

- French and English, one JSON per language, kebab-case keys grouped by screen and feature (`job-offers.list.title`). An API value keeps its own spelling in its key (`status.TO_APPROVE`), so no mapping sits between them.
- The language starts from `navigator.language`, is saved in `localStorage` and switches from the app bar.
- MUI's `frFR` and `enUS` locales translate its built-in labels; `Intl` formats dates, and each amount in its entry's currency.

## Loading and errors

- A screen shows a skeleton of its own layout on its first load; the list then keeps its rows while a filter or a page change loads.
- A route's `errorComponent` catches what a screen throws; the root one catches the rest. Its retry resets the failed queries and loads the route again.
- A failed write shows its message where it was triggered: on the field, at the top of the step, or in a snackbar for a transition.

## Tests

A behaviour is proved once, in the layer that owns it.

| Layer                                  | Proves                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Pure functions (schema, error mapping) | Each rule's boundaries, as plain functions                                                       |
| Form machine, through `createActor`    | Each transition and guard, with no DOM                                                           |
| Mock store and handlers                | The state machine under each configuration, since every screen test relies on it                 |
| Screens, through Testing Library + MSW | What a user does: filter the list, walk the form and its errors, run a transition, save settings |

No end-to-end suite: the screen tests run against the same handlers the browser uses. `pnpm test:coverage` writes `coverage/` over all of `src/` except generated files, the entry point and test helpers; the mock counts, since its rules are code the screens depend on. `vite.config.ts` fails the run under 80 %.

## Conventions

- Names in full: a noun for a value, a verb and its object for a function, a state for a boolean.
- A file is named for its one component (`job-offer-form.tsx`, `JobOfferForm`).
- Return early: the empty or failed case first.
- A form holds its fields, their validation and its flow; its parent passes an async `onSave` that performs the request.

## Left out

- **Virtual scrolling**: the list is paginated server side, 20 rows by default and 100 at most.
- **Optimistic writes**: see Data.
- **Auth, CI, monitoring**: out of the brief's scope.
