"use client";

/**
 * Inventory operations available to the screens: ledger, entries and
 * adjustments.
 *
 * The types here are the WIRE CONTRACT — what the API returns as JSON, not the
 * domain entity. The difference is not bureaucracy: over the wire a date is
 * text, and cost arrives null for whoever may not see it. Declaring that keeps
 * the screen from believing it holds a `Date` where it holds a string.
 */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { Material } from "@/modules/catalog/domain";
import type { StockMovementType } from "@/modules/inventory/domain";

// ── Ledger ─────────────────────────────────────────────────────────────────

export interface StockMovementView {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  type: StockMovementType;
  note: string | null;
  /** Null for whoever may not see costs — stripped on the server. */
  unitCost: number | null;
  userName: string | null;
  createdAt: string;
}

export interface MovementPage {
  movements: StockMovementView[];
  total: number;
  hasMore: boolean;
}

export async function listMovements(filters: {
  page: number;
  days: number;
  type?: StockMovementType | "";
  materialId?: string | null;
}): Promise<MovementPage> {
  const query = new URLSearchParams({
    page: String(filters.page),
    days: String(filters.days),
  });
  if (filters.type) query.set("type", filters.type);
  if (filters.materialId) query.set("materialId", filters.materialId);

  const data = await apiGet<Partial<MovementPage>>(`/api/stock/movements?${query}`, {});
  return {
    movements: Array.isArray(data.movements) ? data.movements : [],
    total: data.total ?? 0,
    hasMore: Boolean(data.hasMore),
  };
}

// ── Entry and adjustment ───────────────────────────────────────────────────

/** Returns the material with balance (and average cost) already updated. */
export const registerEntry = (input: {
  materialId: string;
  quantity: number;
  unitCost?: number | null;
  note?: string;
}) => apiSend<Material>("/api/stock/entry", "POST", input);

/** Manual balance correction: the reason is required and lands in the ledger. */
export const adjustStock = (input: { materialId: string; stock: number; reason: string }) =>
  apiSend<Material>("/api/stock/adjust", "POST", input);
