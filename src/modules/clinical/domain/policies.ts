/**
 * Clinical policies: consumption, cost and reversal.
 *
 * Core product rule: materials are consumed, instruments are not.
 */
import type { Material, Procedure } from "@/modules/catalog/domain";
import { BusinessRuleError, toCents } from "@/shared/domain";
import type { ExecutionItem, ProcedureExecution } from "./entities";

export interface CostSummary {
  /** Cost computed from the items that DO have a price. */
  total: number;
  /** Items without cost — the screen must say the total is partial. */
  missing: number;
  /** Total items considered. */
  counted: number;
}

/**
 * Cost of a set of execution items.
 *
 * Instruments are excluded: they are reusable, so their price is an investment
 * in assets, not a cost of the procedure. Adding them would make an extraction
 * look ten times more expensive than it is.
 */
export function summarizeCost(items: Pick<ExecutionItem, "kind" | "quantity" | "unitCost">[]): CostSummary {
  let total = 0;
  let missing = 0;
  let counted = 0;

  for (const item of items) {
    if (item.kind !== "MATERIAL") continue;
    counted++;
    if (item.unitCost === null) {
      missing++;
      continue;
    }
    total += item.quantity * item.unitCost;
  }

  return { total: toCents(total), missing, counted };
}

export interface ReversalPlan {
  /** Quantities to return to stock. */
  returns: { materialId: string; quantity: number }[];
}

/**
 * Computes the return of a reversed execution.
 *
 * Only materials come back — an instrument never left the stock, so returning
 * it would create units out of thin air. Items whose material was deleted
 * afterwards are skipped: there is nowhere to return them, and the historical
 * record stays.
 */
export function planReversal(execution: ProcedureExecution): ReversalPlan {
  if (execution.reversedAt !== null) {
    throw new BusinessRuleError("Este procedimento já foi estornado.");
  }

  const returns = execution.items
    .filter((item) => item.kind === "MATERIAL" && item.materialId !== null)
    .map((item) => ({ materialId: item.materialId as string, quantity: item.quantity }));

  if (returns.length === 0) {
    throw new BusinessRuleError(
      "Não há materiais a devolver: os itens deste registro não existem mais no catálogo."
    );
  }

  return { returns };
}

export interface ShortageDetail {
  materialId: string;
  name: string;
  requested: number;
  available: number;
  unit: string;
}

export interface ConsumptionLine {
  materialId: string;
  quantity: number;
}

export interface PlannedConsumption {
  /** Deductions to apply to stock. */
  deductions: { materialId: string; quantity: number; name: string; unit: string }[];
  /** Items recorded in history (including instruments, which do not deduct). */
  historyItems: {
    kind: "MATERIAL" | "INSTRUMENT";
    name: string;
    quantity: number;
    unit: string | null;
    /** Kept so a reversal knows what to return. */
    materialId: string | null;
    /** The day's cost, frozen together with the name. */
    unitCost: number | null;
  }[];
  /** Procedure cost at the moment of finalization. */
  cost: CostSummary;
}

/**
 * Computes the effect of finalizing a procedure, without touching a database.
 *
 * Core product rule: **materials are consumed, instruments are not**. An
 * instrument is reusable — it enters history as a checklist of what was
 * prepared, but never has its stock deducted.
 *
 * Throws BusinessRuleError when a material is missing from the provided set;
 * shortages are returned so the caller decides what to do.
 */
export function planConsumption(
  procedure: Pick<Procedure, "instruments">,
  requested: ConsumptionLine[],
  availableMaterials: Material[]
): { plan: PlannedConsumption; shortages: ShortageDetail[] } {
  const byId = new Map(availableMaterials.map((m) => [m.id, m]));
  const shortages: ShortageDetail[] = [];
  const deductions: PlannedConsumption["deductions"] = [];

  for (const line of requested) {
    const material = byId.get(line.materialId);
    if (!material) {
      throw new BusinessRuleError(`Material ${line.materialId} não pertence a esta clínica.`);
    }
    if (material.stock - line.quantity < 0) {
      shortages.push({
        materialId: material.id,
        name: material.name,
        requested: line.quantity,
        available: material.stock,
        unit: material.unit,
      });
      continue;
    }
    deductions.push({
      materialId: material.id,
      quantity: line.quantity,
      name: material.name,
      unit: material.unit,
    });
  }

  const empty: PlannedConsumption = {
    deductions: [],
    historyItems: [],
    cost: { total: 0, missing: 0, counted: 0 },
  };
  if (shortages.length > 0) {
    return { plan: empty, shortages };
  }

  const historyItems: PlannedConsumption["historyItems"] = [
    ...deductions.map((d) => ({
      kind: "MATERIAL" as const,
      name: d.name,
      quantity: d.quantity,
      unit: d.unit,
      materialId: d.materialId,
      unitCost: byId.get(d.materialId)?.unitCost ?? null,
    })),
    // Instruments: history yes, stock deduction no — and, for the same reason,
    // no cost either: they go back to the bench.
    ...procedure.instruments.map((pi) => ({
      kind: "INSTRUMENT" as const,
      name: pi.instrument.name,
      quantity: pi.quantity,
      unit: "un",
      materialId: null,
      unitCost: null,
    })),
  ];

  return {
    plan: { deductions, historyItems, cost: summarizeCost(historyItems) },
    shortages: [],
  };
}
