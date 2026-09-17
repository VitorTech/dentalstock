"use client";

/** Leitura do painel. Só leitura: analytics não altera nada. */
import { apiGet } from "@/shared/ui/api-client";

export interface DashboardView {
  totals: {
    materials: number;
    lowStock: number;
    outOfStock: number;
    suppliers: number;
    expiring: number;
    expired: number;
  };
  topConsumed: { id: string; name: string; unit: string; total: number }[];
  topSpecialties: { id: string; name: string; total: number }[];
  consumptionByDay: { date: string; total: number }[];
  totalConsumed30d: number;
  lowStock: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    minStock: number;
    supplier: string | null;
    zero: boolean;
  }[];
  expiring: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    expiresAt: string;
    daysLeft: number;
    expired: boolean;
  }[];
  /** Ausente quando o papel não pode ver valores. */
  cost: {
    total30d: number;
    byDay: { date: string; total: number }[];
    bySpecialty: { name: string; total: number }[];
    byProcedure: { name: string; total: number; executions: number; average: number }[];
    materialsWithoutCost: number;
  } | null;
}

export const getDashboard = () => apiGet<DashboardView | null>("/api/dashboard", null);
