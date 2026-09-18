/**
 * Identity of the current request, for routes and Server Components.
 *
 * Each guard throws a domain error, and translating it into an HTTP status is
 * left to the error handler — or to the layout, which redirects.
 */
import "server-only";

import type { CurrentSession } from "@/modules/identity/application";
import type { AuthenticatedActor } from "@/shared/domain";
import { container } from "./container";

/**
 * Resolves who is calling from the cookie. Returns null when there is no
 * valid session.
 */
export async function currentActor(): Promise<AuthenticatedActor | null> {
  const token = await container.identity.tokenTransport().read();
  return container.identity.authenticate.execute(token);
}

/** Default guard of the data routes: requires a valid session. */
export async function requireAuthenticated(): Promise<AuthenticatedActor> {
  return container.identity.authorization.requireActor(await currentActor());
}

/** Valid session + permission to change the clinic's catalog. */
export async function requireCatalogManager(): Promise<AuthenticatedActor> {
  return container.identity.authorization.requireCatalogManager(await currentActor());
}

/**
 * The full session (actor, user and clinic), or null.
 *
 * An invalid session and an orphan one — deleted user or clinic — are treated
 * alike: neither gives a usable context, and the layout sends both to login.
 */
export async function getSessionContext(): Promise<CurrentSession | null> {
  const actor = await currentActor();
  if (!actor) return null;
  return container.identity.getCurrentSession.execute(actor);
}
