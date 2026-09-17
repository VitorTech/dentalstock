"use client";

/** Operações de identidade: sessão, login e equipe. */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { UserRole } from "@/shared/domain";
import type { TeamUser } from "./team";

/** Identidade da sessão, como `/api/auth/me` devolve. */
export interface SessionView {
  user: { name: string; email: string; role: UserRole };
  tenant: { name: string };
}

/**
 * Sessão atual; `null` quando não há sessão válida.
 *
 * Não usa `apiGet` de propósito: 401 aqui é uma resposta legítima ("ninguém
 * logado"), e não motivo para mandar o visitante ao login — esta chamada roda
 * inclusive no cabeçalho de páginas públicas.
 */
export async function getSession(): Promise<SessionView | null> {
  try {
    const res = await fetch("/api/auth/me");
    return res.ok ? ((await res.json()) as SessionView) : null;
  } catch {
    return null;
  }
}

export const login = (credentials: { email: string; password: string }) =>
  apiSend<{ ok: true }>("/api/auth/login", "POST", credentials);

export const logout = () => apiSend("/api/auth/logout", "POST");

// ── Equipe ─────────────────────────────────────────────────────────────────

export const listTeam = () => apiGet<TeamUser[]>("/api/team", []);

export const inviteMember = (input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) => apiSend<TeamUser>("/api/team", "POST", input);

export const changeMemberRole = (userId: string, role: UserRole) =>
  apiSend<TeamUser>(`/api/team/${userId}`, "PATCH", { role });

export const resetMemberPassword = (userId: string, password: string) =>
  apiSend(`/api/team/${userId}`, "PATCH", { password });

export const removeMember = (userId: string) => apiSend(`/api/team/${userId}`, "DELETE");
