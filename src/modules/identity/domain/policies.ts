/**
 * Role-based permissions.
 *
 * Written as an explicit allowlist: a new role never gains permission through
 * a careless `!==`.
 */
import type { UserRole } from "@/shared/domain";

export function isPlatformAdmin(role: UserRole): boolean {
  return role === "OWNER";
}

/**
 * Permissions inside the clinic.
 *
 * The assistant role was designed around what that person actually does at
 * the chairside: finalize procedures and restock materials. What is left out
 * is not distrust — it keeps a rushed edit during an appointment from
 * reshaping the whole clinic's catalog. Cost is left out because it is the
 * owner's commercial information.
 *
 * Written as an explicit allowlist: a new role never gains permission through
 * a careless `!==`.
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
