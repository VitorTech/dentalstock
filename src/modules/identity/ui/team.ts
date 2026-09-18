import type { UserRole } from "@/shared/domain";

/** Team member as the `/api/team` endpoint returns it. */
export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Explains, in the invite and role screens, what each role can do. */
export const ROLE_HINT: Record<string, string> = {
  MEMBER: "Vê custos, edita catálogo e gerencia a equipe.",
  ASSISTANT: "Finaliza procedimentos e dá entrada no estoque. Não vê custos nem edita cadastros.",
};

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Administrador da plataforma",
  MEMBER: "Acesso completo",
  ASSISTANT: "Auxiliar",
};
