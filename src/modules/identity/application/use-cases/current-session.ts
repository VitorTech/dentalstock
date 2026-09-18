/** Current-session resolution for routes and Server Components. */
import type { TenantRepository } from "@/modules/account/application";
import type { Tenant } from "@/modules/account/domain";
import type { User } from "@/modules/identity/domain";
import type { AuthenticatedActor } from "@/shared/domain";
import type { UserRepository } from "../ports";

export interface CurrentSession {
  actor: AuthenticatedActor;
  user: User;
  tenant: Tenant;
}

/**
 * The actor's full session: user and clinic.
 *
 * It exists so routes and Server Components never query repositories directly.
 * Returns null when the user or the clinic no longer exists — an orphan
 * session is treated as no session, never as an error.
 */
export class GetCurrentSessionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tenants: TenantRepository
  ) {}

  async execute(actor: AuthenticatedActor): Promise<CurrentSession | null> {
    const [user, tenant] = await Promise.all([
      this.users.findById(actor.userId),
      this.tenants.findById(actor.tenantId),
    ]);
    if (!user || !tenant) return null;
    return { actor, user, tenant };
  }
}
