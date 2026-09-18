# Architecture

A **modular monolith**, with **hexagonal architecture (ports & adapters)**
inside each module and the Clean Architecture **dependency rule**: arrows
always point inwards — from the interface and the infrastructure towards the
domain.

The rules in this document are **not convention**: `npm run arch`
([.dependency-cruiser.cjs](.dependency-cruiser.cjs)) fails the build when one
of them is violated. If a rule gets in the way, discuss the rule — do not work
around it.

## Overview

```
src/
├── app/                  Next.js: pages (screen composition) and HTTP routes
│   ├── (app)/…/page.tsx  authenticated screens — compose module components
│   ├── _shell/           header, side drawer, footer, providers
│   └── api/…/route.ts    HTTP edge: access → use case → presenter
├── server/               server-side pieces shared by Next
│   ├── container.ts      COMPOSITION ROOT: the only place that instantiates adapters and use cases
│   ├── auth.ts           current session and guards for server components
│   └── http/route.ts     route(access, handler): explicit, mandatory access per route
├── modules/              one directory per business context (below)
├── shared/               common base for every module (knows none of them)
└── middleware.ts         session-cookie gate + Content-Security-Policy nonce (no database access)
```

### Modules and dependency order

Each module may only depend on those that come **before** it. There is no
backwards arrow — that is what prevents cycles and keeps each module
understandable on its own.

```
shared ← account ← identity ← catalog ← inventory ← clinical ← analytics
```

| Module      | Responsibility                                                                    |
| ----------- | --------------------------------------------------------------------------------- |
| `shared`    | Errors, base types, generic value objects (Email, Money, Quantity…), HTTP, base UI  |
| `account`   | The clinic (tenant) and its theme preferences                                       |
| `identity`  | Users, login, sessions/JWT, roles and permissions, team                             |
| `catalog`   | Materials, instruments, suppliers, procedures; stock level                          |
| `inventory` | Stock ledger (movements), entry, adjustment, expiry and weighted average cost       |
| `clinical`  | Procedure finalization, appointments with several procedures, reversal and history  |
| `analytics` | Dashboard (aggregates catalog, inventory and clinical — read-only)                  |

> When unsure where something belongs, ask **whose data the rule reads**.
> `isLowStock` reads `stock` and `minStock`, attributes of the material →
> `catalog`. `isExpiringSoon` is an inventory control rule → `inventory`.

### Layers inside a module

```
modules/<name>/
├── domain/               PURE code: entities, value objects, policies
│   └── index.ts          barrel — the domain's public API
├── application/
│   ├── ports.ts          interfaces the use cases require (repositories, gateways)
│   ├── use-cases/*.ts    application rules; talks to ports only
│   └── index.ts          barrel — exports the ports
├── adapters/
│   ├── in/http/          presenters (entity → JSON) and parameter reading
│   └── out/prisma/       repositories and mappers (implement the ports)
└── ui/                   the module's React components and hooks (client)
    ├── api.ts            transport: endpoints and wire types
    ├── queries.ts        cache: query keys, read hooks, invalidation on write
    └── internal/         private to the feature (arch rule blocks outsiders)
```

| Layer          | May import                                                  | Must not import                                    |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `domain`       | domains (its own, earlier ones, `shared`)                   | application, adapters, UI, Next, Prisma, **any package** |
| `application`  | domain and application (its own, earlier ones, `shared`)    | adapters, UI, Next, Prisma, packages               |
| `adapters`     | everything from the inner layers, Prisma, packages          | UI, `src/app`, `src/server`                         |
| `ui`           | domain (types and pure policies), other `ui`, `shared/ui`   | application, adapters, infrastructure, `src/server`, `src/app` |
| `app/api`      | `server/*`, presenters, `shared/infrastructure/http`        | Prisma, UI, use cases/outbound adapters directly     |

Additional checked rules:

- **No cycles** at any level.
- **Between modules, only through the barrels**: `@/modules/catalog/domain`,
  never `@/modules/catalog/domain/entities`. Whatever is not in `index.ts` is an
  internal detail and may change without notice.
- **Only the container instantiates** use cases, repositories and the Prisma
  client.
- `shared` knows no module; module screens know nothing about the `_shell`.
- A file nobody imports raises a warning (dead code).

## Front-end: feature-based

The interface follows the same split as the server — **one feature per
module**. There is no global `components/` folder: a component lives in the
feature it talks about, and `shared/ui` only holds what has no owner (Spinner,
SearchBar, ErrorBanner, formatting).

```
src/app/(app)/materiais/page.tsx     COMPOSITION: screen layout, page state
  ├── modules/inventory/ui/MaterialStockRow.tsx     feature component
  ├── modules/inventory/ui/api.ts                   ← transport: URL, body, wire types
  ├── modules/inventory/ui/queries.ts               ← cache: keys, hooks, invalidation
  └── shared/ui/{SearchBar,ErrorBanner,format}      generic, no business rule
```

### The data layer lives in the feature

Each feature declares its operations in `ui/api.ts`: URL, body, response type.
Screens call `listMaterials()` or `registerEntry(...)`, never
`fetch("/api/...")`.

- **URL and shape in one place.** Renaming an endpoint is one edit in the
  feature's `api.ts`, not a hunt for `fetch(` across the project.
- **Explicit wire types.** What the API returns is NOT the domain entity: a
  date becomes text, and cost arrives null for whoever may not see it. Types
  like `StockMovementView` and `ExecutionView` say so out loud.
- **Reads and writes follow different rules.** `apiGet` degrades to a default
  value (a failed list becomes an empty list, the screen survives); `apiSend`
  throws `ApiError` with the server message — a write that fails silently makes
  the user believe it was saved.
- This is enforced: ESLint refuses `fetch` outside `ui/api.ts`, and refuses
  `apiGet`/`apiSend` outside that layer.

### Server state is cache, not component state

`ui/queries.ts` sits next to `api.ts` and holds the **TanStack Query** layer:
query keys, the read hooks and what each write invalidates. The split is
deliberate — `api.ts` says *what the endpoint is*, `queries.ts` says *when an
answer may be reused and what stops being true after a write*.

The reasoning, all of it measured on the running app:

- **Deduplication.** `useMe` is read by the header, by the page and by every
  procedure card. It used to be a hand-written module cache with a shared
  in-flight promise, because without one, opening a specialty with twelve
  procedures fired fourteen identical requests. That is exactly what a query
  cache does, so the hand-rolled version is gone and its reasoning survives as
  configuration: one key, `staleTime: Infinity`, no refetch on mount.
- **Polling that stops when nobody is looking.** The procedures screen
  revalidates balances in the background. The previous version was an interval
  plus a `visibilitychange` listener written by hand; a front desk leaves the
  screen open all day and the naive timer produced hundreds of requests an hour
  with the tab hidden. Now it is `refetchInterval` +
  `refetchIntervalInBackground: false`, plus revalidation on focus.
- **Invalidation instead of hand patching.** A stock entry changes a balance
  shown on three screens. Every mutation invalidates by key; no screen splices
  arrays, because "the material was created but the list still shows the old
  one" comes from exactly that.
- **Pagination as an infinite query.** The ledger and the history load more
  pages into the same cache entry, so returning from a detail screen does not
  start the list over.
- **Errors keep their meaning.** Retries skip 4xx: a 403 will not become a 200
  by asking three more times. And finalization is *not* a `useMutation` — its
  409 is an expected outcome (the transaction was refused for lack of stock,
  and the answer lists what is missing), so it is modelled as a result, not an
  error.

### A public boundary without barrels

`ui/internal/` is private to its feature (`npm run arch` blocks outsiders); the
rest of `ui` is the public API. There is no `ui/index.ts`.

This was **measured**, not assumed: when trying a barrel with the catalog
components, a screen that used a single component started loading every modal
and row of the feature — about **+10 kB of First Load JS**. A barrel tidies the
import statement and fattens the bundle; on the client, the price is not worth
it.

## Flow of a request

```
fetch("/api/materials/123", PATCH)
  → app/api/materials/[id]/route.ts
      route("catalogManager", …)          access resolved BEFORE the handler (401/403)
      container.catalog.updateMaterial     use case: validates with value objects,
                                           applies the policy, calls the port
      → PrismaMaterialRepository           outbound adapter, always filtering tenantId
      ← presenter                          field allowlist (cost stripped by role)
  ← NextResponse.json(...)                 domain errors → HTTP status in withErrorHandling
```

## Decisions the code upholds

- **Validation at the domain boundary**, in the value objects: if an instance
  exists, it is valid. The `optional()` paths treat "empty" as absence.
- **Multi-tenancy by discriminator**: every port takes `tenantId`; an id from
  another clinic simply "does not exist" (404, never 403 — that would confirm
  existence).
- **Permission decided on the server.** The UI hides what a role cannot use,
  but `route(access)` / the use case is what blocks it; cost leaves the DTO in
  the presenter.
- **Balance and movement in the same transaction** — stock changed without a
  line in the ledger is exactly the state the ledger exists to prevent.
- **Domain policies serve both sides.** They are pure functions, so the screen
  uses the same rule as the server (`isLowStock`, `needsExpiryAttention`,
  `summarizeCost`). The ones that read dates accept `DateLike` (`Date` or ISO
  text), because on the client a date arrives over JSON.
- **JWT HS256 in an httpOnly cookie**, with a persisted session as the
  revocation anchor.
- **Brute force is contained by a counter, not a CAPTCHA**: two keys (account
  and IP), different limits, a short block that clears itself. The per-account
  limit is deliberately generous — tightening it would turn the defense into a
  denial of service against the legitimate user. The counter is a **generic
  policy in `shared/domain`** with a single table behind it, so the login limit
  and the per-origin write budget are the same primitive with different
  thresholds.
- **The route helper carries the cross-cutting security.** CSRF (`Origin`
  check), the write budget, `Cache-Control: no-store` on authenticated
  responses and the logging of every 401/403/429 run inside
  `route(access, handler)` — a new endpoint inherits them without its author
  remembering. The same helper absorbed Next 15 turning `params` into a
  Promise: one file changed, no dynamic route did.
- **A CSP with a real nonce, at the cost of static rendering.** The nonce is
  minted per request in the middleware, which makes every page dynamic. The
  alternative — `'unsafe-inline'`, so Next's inline scripts keep working —
  would let any injected script run and turn the header into decoration. A few
  milliseconds of TTFB on the landing page is the cheaper side of that trade.
- **`server-only`** in `container.ts`: importing the server from a client
  component breaks the build instead of leaking in production.

## Where new code goes

| I need…                                       | It goes in                                                       |
| --------------------------------------------- | ---------------------------------------------------------------- |
| a pure business rule                          | `modules/<m>/domain/policies.ts` (+ a test next to it)            |
| to validate/normalize a field                 | a value object in `domain/value-objects.ts` (or `shared/domain`)  |
| a system operation                            | `application/use-cases/<subject>.ts` + wiring in the `container`  |
| to read/write data                            | a method on the port (`ports.ts`) + an implementation in `adapters/out/prisma` |
| an endpoint                                   | `app/api/…/route.ts` with `route(access, …)` + a presenter        |
| a component for one area                      | `modules/<m>/ui/`                                                  |
| to call an endpoint                           | a function in `modules/<m>/ui/api.ts` (+ the response type)       |
| to cache or invalidate that answer            | a key and a hook in `modules/<m>/ui/queries.ts`                    |
| an internal detail of a component             | `modules/<m>/ui/internal/`                                         |
| a generic component (no business rule)        | `shared/ui/`                                                       |
| a screen                                      | `app/(app)/<route>/page.tsx`, composing module components          |

Checklist for a new use case: port → use case → test with in-memory
repositories (see `clinical/application/use-cases/executions.test.ts`) → Prisma
adapter → container → route → presenter.

## Conventions

- React components: `PascalCase.tsx`. Every other file: `kebab-case.ts`
  (`stock-movement.repository.ts`, `use-finalize-procedure.ts`).
- Hooks: `use-*.ts`, exporting `useSomething`.
- Tests next to the code: `*.test.ts`. No call mocks — ports are interfaces, so
  the tests use in-memory implementations and check the **effect** (what was
  written).
- Imports use the `@/` alias; relative paths only inside the same folder (`./`)
  or one level up.
- Comments explain **why**, not what.
- Code, comments and documentation are in English; user-facing strings and API
  messages stay in Portuguese, the language of the product's users.

## Quality

```bash
npm run verify     # typecheck + lint + architecture + tests (run before every commit)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (next/core-web-vitals + typescript-eslint)
npm run arch       # dependency-cruiser: layers, module order, barrels, cycles
npm run test       # Vitest
npm run build      # production build (also runs lint and route type checking)
```
