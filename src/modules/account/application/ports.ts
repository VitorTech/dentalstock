/**
 * Portas da conta.
 *
 * Convenção de segurança: todo método que acessa dados de clínica recebe o
 * identificador explicitamente. O isolamento entre clientes é imposto na
 * assinatura da porta, não na lembrança de quem escreve a consulta.
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
