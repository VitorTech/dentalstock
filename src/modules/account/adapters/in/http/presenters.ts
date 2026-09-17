/** Contrato HTTP da conta: preferências da clínica. */
import type { Tenant } from "@/modules/account/domain";

/** Allowlist explícita: a resposta carrega só o que a tela precisa. */
export function toTenantSettingsResponse(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    themeMode: tenant.themeMode,
    accentColor: tenant.accentColor,
  };
}
