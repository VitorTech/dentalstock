"use client";

/** Account cache: the clinic's theme preferences. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ThemeMode } from "@/modules/account/domain";
import { getTenantSettings, updateTenantSettings } from "./api";

export const accountKeys = {
  settings: ["account", "settings"] as const,
};

export const useTenantSettings = () =>
  useQuery({ queryKey: accountKeys.settings, queryFn: getTenantSettings });

export function useUpdateTenantSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: { themeMode?: ThemeMode; accentColor?: string }) =>
      updateTenantSettings(patch),
    onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.settings }),
  });
}
