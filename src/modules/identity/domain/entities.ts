/** Identidade: usuários da plataforma e suas credenciais. */
import type { UserRole, Uuid } from "@/shared/domain";

export interface User {
  id: Uuid;
  tenantId: Uuid;
  email: string;
  name: string;
  role: UserRole;
}

/** Usuário com o hash da senha — só circula dentro do fluxo de autenticação. */
export interface UserCredentials extends User {
  passwordHash: string;
}
