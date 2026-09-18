/**
 * Account ports.
 *
 * Security convention: every method that reads clinic data takes the clinic
 * identifier explicitly. Isolation between customers is enforced by the port
 * signature, not by the memory of whoever writes the query.
 */
import type { Tenant } from "@/modules/account/domain";
import type { Uuid } from "@/shared/domain";

export interface TenantRepository {
  findById(id: Uuid): Promise<Tenant | null>;
  slugExists(slug: string): Promise<boolean>;
  create(data: { name: string; slug: string }): Promise<Tenant>;
  updateTheme(
    id: Uuid,
    data: { themeMode?: string; accentColor?: string; name?: string }
  ): Promise<Tenant>;
  delete(id: Uuid): Promise<void>;
}
