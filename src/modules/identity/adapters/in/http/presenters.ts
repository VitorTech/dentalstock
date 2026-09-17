/**
 * Contrato HTTP de identidade.
 *
 * Presenters são allowlists: só sai o que está escrito aqui. Hash de senha e
 * campos internos não têm caminho até a resposta, nem se forem adicionados às
 * entidades depois.
 */
import type { CurrentSession } from "@/modules/identity/application";
import type { User } from "@/modules/identity/domain";

/** Usuário como aparece na equipe da clínica e no console da plataforma. */
export function toUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/** Identidade e tema da clínica para a interface — nada de cobrança. */
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
