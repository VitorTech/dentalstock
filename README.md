# DentalStock

Inventory control for dental clinics, organized **per procedure**: materials
leave stock when an appointment is finalized, and every movement is recorded
with its author, date and reason.

A **multi-clinic** application built with **Next.js 14** (App Router +
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

- Next.js 14 (App Router, Route Handlers as the API)
- TypeScript + TailwindCSS
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

Security properties the code maintains:

- **Permission is decided on the server.** The interface hides what a role
  cannot use, but the route's declared access is what blocks it — and cost is
  removed from the DTO, not from the screen.
- **Multi-clinic isolation** by `tenantId` on every port; a resource from
  another clinic answers 404, never 403 — a 403 would confirm the record exists.
- **JWT (HS256) in an httpOnly cookie**, with a persisted session as the
  revocation anchor: the token is only valid while its `jti` is active.
- **Login attempt limiting** per account and per IP, counted in the database
  (surviving restarts and valid across every instance).
- **SQL injection**: every access goes through Prisma's typed API, with
  parameterized commands. The project uses neither `$queryRawUnsafe` nor
  `$executeRawUnsafe`.
- **CSV injection**: the export neutralizes cells starting with `=`, `+`, `-`
  or `@`, which Excel would interpret as formulas.

## Data model (summary)

- **Tenant**: the clinic. Every record belongs to one and queries filter by it.
- **User / Session / LoginThrottle**: access, revocation and attempt limiting.
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
