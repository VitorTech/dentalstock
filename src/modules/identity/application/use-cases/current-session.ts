/** Resolução da sessão atual para rotas e Server Components. */
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
 * Sessão completa do ator: usuário e clínica.
 *
 * Existe para que rotas e Server Components não consultem repositórios
 * diretamente. Devolve null quando o usuário ou a clínica não existem mais —
 * uma sessão órfã é tratada como ausência de sessão, nunca como erro.
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
