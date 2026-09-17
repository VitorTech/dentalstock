import type { UserRole } from "@/shared/domain";

/** Membro da equipe como a API `/api/team` o devolve. */
export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Explica, no convite e na troca de papel, o que cada papel pode fazer. */
export const ROLE_HINT: Record<string, string> = {
  MEMBER: "Vê custos, edita catálogo e gerencia a equipe.",
  ASSISTANT: "Finaliza procedimentos e dá entrada no estoque. Não vê custos nem edita cadastros.",
};

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Administrador da plataforma",
  MEMBER: "Acesso completo",
  ASSISTANT: "Auxiliar",
};
