/** Account HTTP contract: the clinic's preferences. */
import type { Tenant } from "@/modules/account/domain";

/** Explicit allowlist: the response carries only what the screen needs. */
export function toTenantSettingsResponse(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    themeMode: tenant.themeMode,
    accentColor: tenant.accentColor,
  };
}
