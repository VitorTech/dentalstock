/** Identity: platform users and their credentials. */
import type { UserRole, Uuid } from "@/shared/domain";

export interface User {
  id: Uuid;
  tenantId: Uuid;
  email: string;
  name: string;
  role: UserRole;
}

/** User plus password hash — only circulates inside the authentication flow. */
export interface UserCredentials extends User {
  passwordHash: string;
}
