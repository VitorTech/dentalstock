/** Use cases for the clinic's preferences (name and theme). */
import { HexColor, type Tenant } from "@/modules/account/domain";
import { NonEmptyText, NotFoundError, type Uuid, ValidationError } from "@/shared/domain";
import type { TenantRepository } from "../ports";

export class UpdateTenantThemeUseCase {
  constructor(private readonly tenants: TenantRepository) {}

  async execute(
    tenantId: Uuid,
    input: { themeMode?: unknown; accentColor?: unknown; name?: unknown }
  ) {
    const data: { themeMode?: string; accentColor?: string; name?: string } = {};

    if (input.themeMode !== undefined) {
      // Strict allowlist: any value outside the list is rejected.
      const allowed = ["light", "dark", "system"];
      if (typeof input.themeMode !== "string" || !allowed.includes(input.themeMode)) {
        throw new ValidationError("Modo de tema inválido.", "themeMode");
      }
      data.themeMode = input.themeMode;
    }
    if (input.accentColor !== undefined) {
      data.accentColor = HexColor.create(input.accentColor, "accentColor").value;
    }
    if (input.name !== undefined) {
      data.name = NonEmptyText.create(input.name, "nome da clínica").value;
    }

    if (Object.keys(data).length === 0) throw new ValidationError("Nada para atualizar.");
    return this.tenants.updateTheme(tenantId, data);
  }
}

/** Clinic preferences shown on the settings screen. */
export class GetTenantSettingsUseCase {
  constructor(private readonly tenants: TenantRepository) {}

  async execute(tenantId: Uuid): Promise<Tenant> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundError("Clínica não encontrada.");
    return tenant;
  }
}
