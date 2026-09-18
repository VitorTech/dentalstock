"use client";

/**
 * Identity cache: the current session and the clinic's team.
 *
 * `useMe` used to be a hand-written module cache with a shared in-flight
 * promise — it existed because the hook is consumed by the header, by the page
 * and by every procedure card, and without deduplication opening a specialty
 * with twelve procedures fired fourteen identical requests. That is precisely
 * what a query cache does, so the hand-rolled version is gone and the reasoning
 * survives as configuration: one key, a long `staleTime`, no refetch on mount.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@/shared/domain";
import {
  changeMemberRole,
  getSession,
  inviteMember,
  listTeam,
  removeMember,
  resetMemberPassword,
} from "./api";
import type { TeamUser } from "./team";

export const identityKeys = {
  session: ["identity", "session"] as const,
  team: ["identity", "team"] as const,
};

/**
 * Identity of the current session, so the interface can adapt to the role.
 *
 * Important: this is VISUAL CONVENIENCE, not security. Hiding a button
 * protects nothing — the route guard on the server is what decides. The screen
 * uses this only to avoid offering an action that would end in a 403.
 */
export function useMe() {
  const { data, isLoading } = useQuery({
    queryKey: identityKeys.session,
    queryFn: getSession,
    // The session does not change while the page is open; signing out performs
    // a hard navigation, which drops the cache with the page.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const role = data?.user.role;

  return {
    me: data ?? null,
    loading: isLoading,
    /** May change the clinic's catalog (materials, instruments, procedures). */
    canManage: role === "OWNER" || role === "MEMBER",
    /** May see costs. */
    canSeeCosts: role === "OWNER" || role === "MEMBER",
  };
}

// ── Team ───────────────────────────────────────────────────────────────────

export const useTeam = () => useQuery({ queryKey: identityKeys.team, queryFn: listTeam });

export function useInviteMember(onCreated?: (user: TeamUser) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string; role: UserRole }) =>
      inviteMember(input),
    onSuccess: (user) => {
      client.invalidateQueries({ queryKey: identityKeys.team });
      onCreated?.(user);
    },
  });
}

export function useChangeMemberRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      changeMemberRole(userId, role),
    onSuccess: () => client.invalidateQueries({ queryKey: identityKeys.team }),
  });
}

export function useResetMemberPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetMemberPassword(userId, password),
  });
}

export function useRemoveMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => client.invalidateQueries({ queryKey: identityKeys.team }),
  });
}
