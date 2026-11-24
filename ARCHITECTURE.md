# Architecture

A React 19 + MUI app to manage job offers through a per-company workflow, against a mocked API built from `job-offer-swagger.yml`.

## Stack

| Need                   | Choice                                           | Why                                                                                    |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Build                  | Vite + TypeScript (strict)                       | Fast dev server, no framework the brief does not need                                  |
| UI                     | MUI                                              | Imposed by the brief                                                                   |
| Routing                | TanStack Router                                  | Typed routes and search params: filters, sort and page live in the URL, validated      |
| Server state           | TanStack Query                                   | Cache, loading and error states, invalidation after a write                            |
| API client             | `openapi-typescript` + `openapi-fetch`           | Types generated from the swagger; a dozen hooks written by hand stay readable          |
| Forms                  | react-hook-form + zod                            | Uncontrolled inputs, one schema for types and validation                               |
| Form flow              | XState v5                                        | Steps, saving and failures as explicit states: an impossible combination cannot exist |
| Mock API               | MSW                                              | The same handlers serve the browser and the tests                                      |
| i18n                   | react-i18next                                    | French and English, switchable at runtime                                              |
| Tests                  | Vitest + Testing Library + MSW                   | Same config as Vite; screens tested against the real handlers                          |
| Lint and format        | oxlint + oxfmt                                   | Fast, one config each                                                                  |

No global store: the URL holds the UI state that must survive a reload or a shared link, Query holds the server state, and a component holds the rest.

## Layers

Imports go one way: `routes → screens → features → shared`. A layer never imports from one above it.

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
│   ├── api/                openapi-fetch client, generated types
│   ├── ui/                 presentational pieces over MUI (page layout, skeletons)
│   └── i18n/               setup, language switcher, `fr.json`, `en.json`
└── mocks/                  MSW handlers, in-memory store, seed
```

- **A screen is named entity first, then its verb** (`job-offer-edit`, `job-offer-new`): an entity's screens sort together.
- **A screen owns its page**: its layout, its copy, which blocks it shows. It holds no API call of its own.
- **A feature exports blocks, never a page**: a screen imports `@/features/job-offers`, never a file inside it.
- **`shared/` knows no domain**: nothing in it names a job offer.

## Data

- **Query keys**: one `as const` factory per feature (`jobOfferKeys.all`, `jobOfferKeys.list(filters)`, `jobOfferKeys.detail(id)`, `jobOfferKeys.transitions(id)`); no key is written inline, so an invalidation cannot miss its query.
- **Reads**: one Query hook per endpoint, keyed through the factory.
- **Writes**: a mutation hook per endpoint. On success it invalidates what it touched: the offer, its transitions, its history and the list. Writes are not optimistic: the next status depends on the company's configuration, which only the server knows.
- **Company**: `X-Company-Id` comes from `CURRENT_COMPANY_ID`, a const in `shared/api/` that the client sets on every request. It stands in for the signed-in user's session, which would provide it in a real project; auth is out of scope.
- **Types**: `pnpm api:types` regenerates `shared/api/schema.d.ts` from the swagger. Nothing else is hand-typed for the wire.

## Workflow and transitions

The server decides which transitions exist; the UI never recomputes the state machine.

- The detail screen reads `GET /job-offers/{id}/transitions`: each transition names its action, its target status and whether it needs a reason. The button's label follows the target ("Submit for approval" when the target is `TO_APPROVE`, "Publish" when it is `PUBLISHED`).
- `reject` opens a dialog for its reason; `withdraw` and `close` ask for confirmation.
- Edit and Delete are not transitions. The UI shows them in the statuses the swagger allows (Edit in `DRAFT` and `TO_FINALIZE`, Delete in `DRAFT`); the server's 409 stays the authority.
- A new workflow step (a new status or action) needs a label and a colour, no new branching.

## Forms

The create and edit screens share `JobOfferForm`: three steps (basic information, compensation, review) over one `useForm`, driven by one XState machine.

### Who holds what

Each piece of state has one owner; nothing is copied into a `useState`.

| State                                           | Owner                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| The flow: step, validating, saving, failure     | `jobOfferFormMachine`                                                |
| Values and field errors                         | react-hook-form (`shouldUnregister: false` keeps a hidden step's values) |
| The request and the cache invalidation          | The mutation, invoked by the machine                                 |
| The company's configuration                     | Query, loaded by the screen and given to the machine as input        |
| Create or edit                                  | Props: an `offer` means edit, and `defaultValues` come from `toJobOfferFormValues(offer)`; without one, empty values |
| Leaving with unsaved changes                    | TanStack Router's `useBlocker`                                       |
| An offer no longer editable                     | The edit route's loader, which sends it back to its detail           |

### The machine

```
editing
 ├── basicInfo ──NEXT──▶ validating ──valid──▶ compensation ──NEXT──▶ validating ──valid──▶ review
 │      ◀──────────────────BACK─────────────────────┘      ◀────────────BACK──────────────┘
 ├── SAVE_DRAFT [partialSaveEnabled] ──▶ saving
 └── SUBMIT (from review) ─────────────▶ saving

saving ──done──────▶ saved: navigate to the detail
       ──422───────▶ editing.<step of the first field in error>, with setError
       ──409───────▶ conflict: a message and a link to the detail, no more input
       ──network───▶ editing.<same step>, with a message
```

- **Validation is a state**: XState computes a transition synchronously, so a guard is a plain predicate (v5, and still `=> boolean` in the v6 beta). `validating` invokes react-hook-form's `trigger` on the step's fields as a promise actor instead.
- **No double send**: `saving` accepts no event.
- **Partial save**: the `partialSaveEnabled` guard offers "Save draft" at every step, against a schema that needs only title and location; otherwise only the review saves, against the full schema.
- **A 422 on a hidden step**: `fieldErrors[].field` (`compensation.salaryEntries[0].amount`) becomes the form path, and the machine returns to the first step holding an error so the message is seen.

### Schema and request

- **Schema**: built from the swagger's constraints (title 1 to 200 chars, country `^[A-Z]{2}$`, currency `^[A-Z]{3}$`, amounts ≥ 0, address required when location is `CUSTOM`). A complete offer needs at least one salary or bonus entry.
- **Location**: a union on `location.type`. Switching to `COMPANY_ADDRESS` keeps the typed address in the values, in case the user switches back; `toJobOfferRequest` drops it when sending.
- **Validation mode**: `onTouched`, so no error shows before the user leaves a field.

## Mock API

MSW intercepts every call in the browser and in the tests; there is no backend to run.

- An in-memory store implements the swagger's state machine, its pagination, filters and sorting.
- Each offer keeps the workflow configuration it was created with: a configuration change applies to new offers only, as the swagger states.
- Every response waits a realistic delay (`delay()`), zero in tests, so skeletons and pending states show.
- Refusals use the swagger's codes: 409 `INVALID_STATE`, 400 `INVALID_TRANSITION`, 422 `VALIDATION_ERROR` and `INCOMPLETE_OFFER`.
- A seed of about 30 offers covers every status.

## Internationalization

- French and English, one JSON per language, kebab-case keys grouped by screen and feature (`job-offers.list.title`). An API value keeps its own spelling in its key (`status.TO_APPROVE`), so no mapping sits between them.
- The language starts from `navigator.language`, is saved in `localStorage` and switches from the app bar.
- MUI's `frFR` and `enUS` locales translate its built-in labels; `Intl` formats dates and amounts in the offer's currency.

## Loading and errors

- Each screen shows a skeleton of its own layout while its query is pending.
- A route's `errorComponent` catches what a screen throws; the root one catches the rest, with a retry.
- A failed write shows its message where it was triggered: on the field, above the form, or in a snackbar for a transition.

## Tests

A behaviour is proved once, in the layer that owns it.

| Layer                                  | Proves                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Pure functions (schema, error mapping) | Each rule's boundaries, as plain functions                                                |
| Form machine, through `createActor`    | Each transition and guard, with no DOM                                                    |
| Mock store                             | The state machine under each configuration, since every screen test relies on it          |
| Screens, through Testing Library + MSW | What a user does: filter the list, walk the form and its errors, run a transition, save settings |

No end-to-end suite: the screen tests run against the same handlers the browser uses. `pnpm test:coverage` writes `coverage/`.

## Conventions

- Names in full: a noun for a value, a verb and its object for a function, a state for a boolean.
- A file is named for its one component (`job-offer-form.tsx`, `JobOfferForm`).
- Return early: the empty or failed case first.
- A form holds its fields and their validation; its parent passes `onSubmit` and the failure to show.

## Left out

- **Virtual scrolling**: the list is paginated server side, 20 rows by default and 100 at most.
- **Optimistic writes**: see Data.
- **Auth, CI, monitoring**: out of the brief's scope.
