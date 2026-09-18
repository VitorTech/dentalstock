"use client";

/** Dashboard cache. Read-only: analytics changes nothing. */
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "./api";

export const analyticsKeys = {
  dashboard: ["analytics", "dashboard"] as const,
};

export const useDashboard = () =>
  useQuery({ queryKey: analyticsKeys.dashboard, queryFn: getDashboard });
