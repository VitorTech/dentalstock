/**
 * Conta: a clínica (tenant) e suas preferências.
 *
 * Todo dado do sistema pertence a uma clínica. O identificador dela viaja em
 * toda porta de repositório — é assim que o isolamento entre clientes deixa de
 * depender da memória de quem escreve a consulta.
 */
import type { Uuid } from "@/shared/domain";

export type ThemeMode = "light" | "dark" | "system";

export interface Tenant {
  id: Uuid;
  name: string;
  slug: string;
  themeMode: ThemeMode;
  accentColor: string;
}
