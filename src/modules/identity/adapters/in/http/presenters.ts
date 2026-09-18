/**
 * Identity HTTP contract.
 *
 * Presenters are allowlists: only what is written here leaves the server. The
 * password hash and internal fields have no path to the response, not even if
 * they are later added to the entities.
 */
import type { CurrentSession } from "@/modules/identity/application";
import type { User } from "@/modules/identity/domain";

/** A user as shown in the clinic's team screen. */
export function toUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/** Identity and clinic theme for the interface. */
export function toSessionResponse(session: CurrentSession) {
  const { user, tenant } = session;
  return {
    user: toUserResponse(user),
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      themeMode: tenant.themeMode,
      accentColor: tenant.accentColor,
    },
  };
}
