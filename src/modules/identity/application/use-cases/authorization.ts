/**
 * Authorization — a single entry point for "who may do what".
 *
 * Concentrating it here avoids the worst kind of multi-tenant failure: a new
 * route that forgets to check the actor and starts answering without a session.
 */
import { canManageCatalog } from "@/modules/identity/domain";
import { type AuthenticatedActor, ForbiddenError, UnauthorizedError } from "@/shared/domain";

export class AuthorizationService {
  /** Requires a valid session. */
  requireActor(actor: AuthenticatedActor | null): AuthenticatedActor {
    if (!actor) throw new UnauthorizedError();
    return actor;
  }

  /**
   * Requires permission to change the clinic's catalog.
   *
   * Guards the write routes for materials, instruments, suppliers and
   * procedures — everything that defines HOW the clinic works. The assistant
   * operates within those definitions instead of rewriting them.
   */
  requireCatalogManager(actor: AuthenticatedActor | null): AuthenticatedActor {
    const current = this.requireActor(actor);
    if (!canManageCatalog(current.role)) {
      throw new ForbiddenError("Seu perfil não pode alterar o cadastro da clínica.");
    }
    return current;
  }
}
