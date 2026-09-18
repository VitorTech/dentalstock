"use client";

/** Clinic operations: theme preferences. */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { ThemeMode } from "@/modules/account/domain";

export interface TenantSettingsView {
  name: string;
  themeMode: ThemeMode;
  accentColor: string;
}

export const getTenantSettings = () =>
  apiGet<TenantSettingsView | null>("/api/tenant", null);

export const updateTenantSettings = (patch: { themeMode?: ThemeMode; accentColor?: string }) =>
  apiSend<TenantSettingsView>("/api/tenant", "PATCH", patch);
