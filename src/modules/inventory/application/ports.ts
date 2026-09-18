/**
 * Inventory ports.
 *
 * `StockMovementRepository.register` exists as a single operation — rather
 * than separate "update balance" and "write movement" calls — because the
 * balance and its explanation must change together.
 */
import type { Material } from "@/modules/catalog/domain";
import type { StockMovement, StockMovementType } from "@/modules/inventory/domain";
import type { Uuid } from "@/shared/domain";

/**
 * The stock ledger.
 *
 * `register` is its own port — instead of separate "update stock" and "write
 * movement" calls — because the balance and its explanation must change
 * together. Stock changed without a matching movement is precisely the record
 * nobody can audit later.
 */
export interface StockMovementRepository {
  register(input: {
    tenantId: Uuid;
    materialId: Uuid;
    /** Signed: negative leaves, positive enters. */
    quantity: number;
    type: StockMovementType;
    note: string | null;
    unitCost: number | null;
    /** New material cost, already computed by the policy. */
    newMaterialCost?: number | null;
    userId: Uuid | null;
    userName: string | null;
  }): Promise<Material>;

  listByTenant(input: {
    tenantId: Uuid;
    materialId?: Uuid;
    type?: StockMovementType;
    sinceDays?: number;
    page: number;
    pageSize: number;
  }): Promise<{ items: StockMovement[]; total: number }>;
}

/**
 * Reports of real consumption (non-reversed consumption movements).
 *
 * An inventory port, not a dashboard one: inventory figures depend on it, and
 * the dashboard merely composes it.
 */
export interface ConsumptionReport {
  consumptionByMaterial(tenantId: Uuid): Promise<{ materialId: Uuid; total: number }[]>;
  /** Consumption per material within a window — the basis for restocking. */
  consumptionByMaterialSince(
    tenantId: Uuid,
    days: number
  ): Promise<{ materialId: Uuid; total: number }[]>;
  consumptionBySpecialty(tenantId: Uuid): Promise<{ name: string; total: number }[]>;
  consumptionByDay(tenantId: Uuid, days: number): Promise<{ date: string; total: number }[]>;
}
