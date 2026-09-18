# DentalStock

Inventory control for dental clinics, organized **per procedure**: materials
leave stock when an appointment is finalized, and every movement is recorded
with its author, date and reason.

A **multi-clinic** application built with **Next.js 15** (App Router +
TypeScript), **PostgreSQL** and **Prisma**. Each clinic has its own catalog and
team; isolation is enforced in the signature of every repository port.

> A personal project, also used as an architecture study: a modular monolith
> with hexagonal architecture inside each module, and boundaries checked
> automatically (`npm run verify`). The details are in
> **[ARCHITECTURE.md](ARCHITECTURE.md)**.
>
> The user interface and the messages returned to the user are in Portuguese:
> the product is sold to Brazilian dental clinics. Code, comments and
> documentation are in English.

## What it does

### Procedures and consumption

- Procedures grouped by specialty, searchable by name, category or material.
- Each procedure carries its list of **materials** (consumable) and
  **instruments** (reusable), with quantities adjustable per clinic.
- **Duplicate a procedure** with its whole list, to create variations.
- On **finalize**, stock is deducted transactionally — all or nothing; if a
  material is short, the response says exactly what was missing and nothing is
  deducted. **Materials are consumed, instruments are not** — the latter appear
  in history as a checklist.
- **Appointment with several procedures**: mark everything performed in the
  same visit and finalize them together, in a single transaction.

### Inventory

- **Stock ledger**: no balance changes without a recorded movement — type,
  author, date, reason and cost.
  - `RESTOCK` — purchase entry
  - `CONSUMPTION` — deduction on finalize
  - `ADJUSTMENT` — manual correction, with a **mandatory reason**
  - `REVERSAL` — return from a reversed finalization
- **Material entry** with quantity, invoice cost and a note. When a price is
  given, the material's cost is recomputed as a **weighted average**.
- **Reversal of a finalization**: returns the materials and flags the record as
  reversed — without deleting it, and removing it from the dashboard figures.
- **Batch expiry**, warning on expired / expiring within 30 days.
- **Ledger** filterable by type, period and material.

### Cost

- Unit cost per material (optional — a clinic can adopt it gradually).
- Cost **frozen** at finalize time: changing a purchase price today does not
  rewrite what an appointment cost last month.
- Dashboard with cost for the period, per day, per specialty and the **average
  cost per procedure**.
- When some material has no price, the total is presented as **partial**, never
  as if it were complete.

### Team and access

- Roles: `OWNER`, `MEMBER` (full access) and `ASSISTANT`.
- The **assistant** finalizes procedures and registers stock entries, but does
  not change the catalog, does not correct balances by hand and **does not see
  costs** — the amount is stripped from the response on the server, not hidden
  on screen.
- Invitations, role changes and password resets are handled by the clinic
  itself. Any role or password change ends the user's open sessions.
- **Login attempt limiting** per account and per origin, with a temporary block
  and `Retry-After` in the response.

### Other

- **History** with author, cost and **CSV** export (one row per item).
- Light/dark theme and accent color per clinic.

## Stack

- Next.js 15 (App Router, Route Handlers as the API) + React 19
- TypeScript + TailwindCSS
- TanStack Query v5 for server state on the client (cache, deduplication,
  pagination and invalidation after every write)
- Prisma ORM + PostgreSQL 16 (via Docker Compose)
- Vitest, ESLint and dependency-cruiser

## Running locally

Requirements: Node.js 18+, Docker and Docker Compose.

```bash
npm install
cp .env.example .env   # adjust JWT_SECRET
npm run setup          # starts the database, applies migrations and seeds the catalog
npm run dev
```

Open **http://localhost:3000**. The seed creates an example clinic and the
first user (`admin@clinica.com` / `admin123` by default — change it in `.env`).

More clinics and users:

```bash
npm run tenant:create -- "Clinica Sorriso" sorriso owner@sorriso.com "StrongPass123" "Dra. Ana"
```

```bash
npm run user:create -- <clinic-slug> <email> <password> "<Name>" [MEMBER|ASSISTANT]
```

Stop the database: `npm run db:down`. Inspect the data: `npm run prisma:studio`.

## Quality

```bash
npm run verify   # typecheck + lint + architecture rules + tests
```

`arch` fails if a domain imports Prisma, if a screen imports the container, or
if a module depends on another one that comes after it in the order defined in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Security

The OWASP Top 10 is used here as a checklist, not as a badge. Each item below
says **what the control is** and **where it lives**, because a list of
adjectives proves nothing.

### A01 — Broken access control

- **No route without a declared access level.** Every endpoint is written as
  `route("public" | "authenticated" | "catalogManager", handler)`
  ([src/server/http/route.ts](src/server/http/route.ts)). Forgetting the check
  is not possible: there is no other way to declare a route.
- **Permission is decided on the server.** The interface hides what a role
  cannot use, but what blocks it is the route's access level — and cost leaves
  the DTO in the presenter, so an assistant's response never carries a price to
  be revealed by the browser's devtools.
- **Multi-clinic isolation by `tenantId`** in the signature of every repository
  port. A record from another clinic answers **404, never 403**: a 403 would
  confirm that the id exists.

### A02 — Cryptographic failures

- **Passwords with scrypt** (memory-hard KDF), random salt per user and
  comparison via `timingSafeEqual`.
- **JWT HS256** signed with `JWT_SECRET`, verified in constant time; the
  process refuses to start with a weak secret.
- **Token in an httpOnly + SameSite=Lax cookie**, `Secure` in production —
  never in `localStorage`, where any XSS would read it.
- **HSTS** (`max-age=2y; includeSubDomains; preload`) in production.

### A03 — Injection

- **SQL**: every access goes through Prisma's typed API with parameterized
  commands. The project uses neither `$queryRawUnsafe` nor `$executeRawUnsafe`.
- **XSS**: **Content-Security-Policy with a per-request nonce**, minted in
  [src/middleware.ts](src/middleware.ts) — `script-src 'self' 'nonce-…'
  'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors
  'none'`. Inline scripts without the nonce do not run, which is what separates
  a policy from decoration. The trade-off is deliberate and documented: reading
  the header makes the pages render on demand.
- **CSV injection**: the history export neutralizes cells starting with `=`,
  `+`, `-` or `@`, which Excel would interpret as formulas.
- **Input at the boundary**: value objects validate and normalize before
  anything reaches a use case; ids, pages and filters are read through
  `readId`/`readInt`, with bounds.

### A04 — Insecure design

- **Balance and movement in the same transaction.** Stock cannot change
  without a line in the ledger — the invariant is enforced by the database, not
  by discipline.
- **Costs frozen at finalization**, so rewriting a purchase price cannot
  rewrite history.
- **Write budget per origin**: 300 writes per 5 minutes, with a block and
  `Retry-After` ([src/server/http/request-guards.ts](src/server/http/request-guards.ts)).
  Generous on purpose — a limit that trips on real work gets switched off.

### A05 — Security misconfiguration

- **Security headers on every response**
  ([next.config.js](next.config.js)): `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera, microphone, geolocation, payment, USB and FLoC
  disabled), `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy:
  same-origin`. `X-Powered-By` is removed.
- **`Cache-Control: no-store` on every authenticated response**, so no shared
  cache keeps a copy of one clinic's data.
- **The image optimizer is disabled** (`images.unoptimized`): the feature is
  not used and it is a recurring source of advisories.
- **`server-only`** in the composition root: importing the server from a client
  component breaks the build instead of leaking in production.

### A06 — Vulnerable and outdated components

- `npm audit` is part of the routine. The project runs **Next.js 15.5.x**, the
  line that carries the fixes backported from 16 — the previous 14.x had
  unpatched advisories with no fix inside that major.
- What is left in the report is **build and test tooling** (the `postcss` copy
  bundled inside Next, and `vitest`), which does not process attacker input at
  runtime.

### A07 — Identification and authentication failures

- **Login attempt limiting on two keys**: per account and per origin IP, with
  different thresholds, a temporary block and `Retry-After`. The counter lives
  in the database, so it survives a restart and is shared by every instance.
  The per-account limit is deliberately the more generous of the two:
  tightening it turns the defense into a denial of service against the real
  user.
- **Sessions are revocable**: the JWT is only valid while its `jti` matches an
  active session. Changing a role or a password ends that user's open sessions.
- The login answer never says whether the e-mail exists.

### A08 — Software and data integrity failures

- **CSRF**: `SameSite=Lax` on the session cookie plus an `Origin` check on
  every state-changing request, which runs before the handler and answers 403.
- **No external scripts**: `default-src 'self'` and no third-party tags, so
  there is no CDN whose compromise would become ours.

### A09 — Security logging and monitoring failures

- **Structured events** in
  [src/shared/infrastructure/security-log.ts](src/shared/infrastructure/security-log.ts):
  `login.failed`, `login.blocked`, `access.denied`, `rate_limit.blocked` and
  `csrf.rejected`, each with path, method, address and moment — one JSON line
  per event, ready for any collector.
- **No secrets in the log**: never a password, a token, a cookie or a request
  body.
- The **ledger** is the business audit trail: who moved what, when and why.

### A10 — Server-side request forgery

- The server makes no outbound request from user-supplied input. Material
  images are URLs **rendered by the browser**, never fetched by the server, and
  the `ImageUrl` value object restricts them to `http`/`https`.

## Data model (summary)

- **Tenant**: the clinic. Every record belongs to one and queries filter by it.
- **User / Session / ThrottleCounter**: access, revocation and attempt limiting
  (the counter is generic: login and the write budget share it).
- **Material**: stock item (unit, image, balance, minimum, cost, expiry).
- **Instrument**: reusable instrument — it has inventory, but is not consumed
  and therefore has no minimum stock.
- **Supplier**: supplier, used for restocking.
- **Procedure / ProcedureMaterial / ProcedureInstrument**: the procedure and
  its list, with quantities customized per clinic.
- **ProcedureExecution / ProcedureExecutionItem**: history of what was
  finalized, with names and costs snapshotted so they never change in hindsight.
- **StockMovement**: the stock ledger.

## Next steps

- Active restocking and expiry alerts by e-mail (today the warning lives on the
  dashboard).
- Batch-level control, for clinics keeping more than one batch of a material.
- Integration tests covering the HTTP edge (today the tests cover domain and
  application, with in-memory repositories).
