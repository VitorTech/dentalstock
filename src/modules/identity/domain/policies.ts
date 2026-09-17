/**
 * Permissões por papel.
 *
 * Escritas como allowlist explícita: papel novo não ganha permissão por
 * descuido de um `!==`.
 */
import type { UserRole } from "@/shared/domain";

export function isPlatformAdmin(role: UserRole): boolean {
  return role === "OWNER";
}

/**
 * Permissões dentro da clínica.
 *
 * O auxiliar (ASB) foi desenhado para o que ele realmente faz na bancada:
 * finaliza procedimento e dá entrada de material. O que fica de fora não é
 * desconfiança — é evitar que uma edição apressada no meio do atendimento
 * mude o catálogo da clínica inteira. Custo fica de fora por ser informação
 * comercial do dono.
 *
 * Escrito como allowlist explícita: papel novo não ganha permissão por
 * descuido de um `!==`.
 */
export function canManageCatalog(role: UserRole): boolean {
  return role === "OWNER" || role === "MEMBER";
}

export function canSeeCosts(role: UserRole): boolean {
  return role === "OWNER" || role === "MEMBER";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "OWNER" || role === "MEMBER";
}
