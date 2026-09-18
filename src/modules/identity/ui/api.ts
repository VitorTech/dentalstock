"use client";

/** Identity operations: session, login and team. */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { UserRole } from "@/shared/domain";
import type { TeamUser } from "./team";

/** Session identity, as `/api/auth/me` returns it. */
export interface SessionView {
  user: { name: string; email: string; role: UserRole };
  tenant: { name: string };
}

/**
 * The current session; `null` when there is none.
 *
 * It does not use `apiGet` on purpose: a 401 here is a legitimate answer
 * ("nobody signed in"), not a reason to push the visitor to the login page —
 * this call also runs in the header of public pages.
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

// ── Team ───────────────────────────────────────────────────────────────────

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
