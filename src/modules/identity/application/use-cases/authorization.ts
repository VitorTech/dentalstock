/**
 * Autorização — uma única porta de entrada para "quem pode fazer o quê".
 *
 * Concentrar isso aqui evita o pior tipo de falha de multi-tenant: uma rota
 * nova que esquece de checar o ator e passa a responder sem sessão.
 */
import { canManageCatalog } from "@/modules/identity/domain";
import { type AuthenticatedActor, ForbiddenError, UnauthorizedError } from "@/shared/domain";

export class AuthorizationService {
  /** Exige sessão válida. */
  requireActor(actor: AuthenticatedActor | null): AuthenticatedActor {
    if (!actor) throw new UnauthorizedError();
    return actor;
  }

  /**
   * Exige permissão para alterar o cadastro da clínica.
   *
   * Guarda das rotas de escrita de material, instrumental, fornecedor e
   * procedimento — tudo que define COMO a clínica trabalha. O auxiliar opera
   * dentro dessas definições, não as reescreve.
   */
  requireCatalogManager(actor: AuthenticatedActor | null): AuthenticatedActor {
    const current = this.requireActor(actor);
    if (!canManageCatalog(current.role)) {
      throw new ForbiddenError("Seu perfil não pode alterar o cadastro da clínica.");
    }
    return current;
  }
}
