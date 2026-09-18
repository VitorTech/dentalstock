/**
 * Cross-cutting types of the shared core.
 *
 * `AuthenticatedActor` lives here, and not in the identity module, because
 * "who is calling" cuts across every use case — including the account ones,
 * which sit below identity in the module order.
 *
 * These are domain models, not table rows: no ORM decorators, no Prisma
 * imports. Persistence adapters map between these types and the database,
 * which is what allows swapping the ORM without touching business rules.
 */

export type Uuid = string;

/**
 * Roles.
 *
 * `OWNER` owns the clinic account. `MEMBER` has full access, and `ASSISTANT`
 * (dental assistant) finalizes procedures and restocks materials, but cannot
 * change the catalog nor see costs.
 */
export type UserRole = "OWNER" | "MEMBER" | "ASSISTANT";

/** Authenticated identity threaded through the use cases. */
export interface AuthenticatedActor {
  userId: Uuid;
  tenantId: Uuid;
  role: UserRole;
  email: string;
  /** Signs operations that record authorship (consumption, adjustment, reversal). */
  name: string;
}
