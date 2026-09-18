/**
 * Dashboard use case.
 *
 * The dashboard has no port or adapter of its own: it composes the reports
 * each module exposes over its own data — consumption (inventory), cost
 * (clinical) and catalog entries. Heavy aggregation stays in the database;
 * here the results are combined and presentation rules applied — for example,
 * the ranking uses REAL consumption, so a clinic that never finalized a
 * procedure shows zeros instead of theoretical demand.
 */
import type { MaterialRepository, SupplierRepository } from "@/modules/catalog/application";
import type { ExecutionCostReport } from "@/modules/clinical/application";
import type { ConsumptionReport } from "@/modules/inventory/application";
import type { Material } from "@/modules/catalog/domain";
import { canSeeCosts } from "@/modules/identity/domain";
import { isLowStock, isOutOfStock } from "@/modules/catalog/domain";
import { daysUntilExpiry, isExpired, needsExpiryAttention } from "@/modules/inventory/domain";
import { type AuthenticatedActor, type Uuid, toCents } from "@/shared/domain";

const CONSUMPTION_WINDOW_DAYS = 30;

const TOP_SIZE = 8;

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
  /** Expired or soon-to-expire materials, expired ones first. */
  expiring: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    expiresAt: string;
    daysLeft: number;
    expired: boolean;
  }[];
  /**
   * Cost block. `null` when the role may not see amounts — omitting it from
   * the DTO is safer than sending it and hiding it on screen.
   */
  cost: {
    total30d: number;
    byDay: { date: string; total: number }[];
    bySpecialty: { name: string; total: number }[];
    byProcedure: { name: string; total: number; executions: number; average: number }[];
    /** Materials with no price — the total stays partial while any remain. */
    materialsWithoutCost: number;
  } | null;
}

export class GetDashboardUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly suppliers: SupplierRepository,
    private readonly consumption: ConsumptionReport,
    private readonly costs: ExecutionCostReport
  ) {}

  async execute(actor: AuthenticatedActor): Promise<DashboardView> {
    const tenantId: Uuid = actor.tenantId;
    const showCosts = canSeeCosts(actor.role);

    const [allMaterials, suppliers, consumed, specialties, byDay] = await Promise.all([
      this.materials.listByTenant(tenantId),
      this.suppliers.countByTenant(tenantId),
      this.consumption.consumptionByMaterial(tenantId),
      this.consumption.consumptionBySpecialty(tenantId),
      this.consumption.consumptionByDay(tenantId, CONSUMPTION_WINDOW_DAYS),
    ]);

    const byId = new Map(allMaterials.map((m) => [m.id, m]));

    const topConsumed = consumed
      .filter((c) => c.total > 0)
      .map((c) => ({
        id: c.materialId,
        name: byId.get(c.materialId)?.name ?? "—",
        unit: byId.get(c.materialId)?.unit ?? "",
        total: c.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_SIZE);

    const topSpecialties = specialties
      .filter((s) => s.total > 0)
      .map((s) => ({ id: s.name, name: s.name, total: s.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_SIZE);

    // Most critical first: whoever is furthest below the minimum tops the list.
    const lowStock = allMaterials
      .filter(isLowStock)
      .map((m) => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        stock: m.stock,
        minStock: m.minStock,
        supplier: m.supplier?.name ?? null,
        zero: isOutOfStock(m),
      }))
      .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock));

    // Expired before "expiring soon": that is what must leave the shelf today.
    const expiring = allMaterials
      .filter((m) => needsExpiryAttention(m))
      .map((m) => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        stock: m.stock,
        expiresAt: m.expiresAt!.toISOString(),
        daysLeft: daysUntilExpiry(m) ?? 0,
        expired: isExpired(m),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      totals: {
        materials: allMaterials.length,
        lowStock: lowStock.length,
        outOfStock: allMaterials.filter(isOutOfStock).length,
        suppliers,
        expiring: expiring.filter((e) => !e.expired).length,
        expired: expiring.filter((e) => e.expired).length,
      },
      topConsumed,
      topSpecialties,
      consumptionByDay: byDay,
      totalConsumed30d: byDay.reduce((sum, d) => sum + d.total, 0),
      lowStock,
      expiring,
      cost: showCosts ? await this.buildCost(tenantId, allMaterials) : null,
    };
  }

  private async buildCost(tenantId: Uuid, materials: Material[]) {
    const [byDay, bySpecialty, byProcedure] = await Promise.all([
      this.costs.costByDay(tenantId, CONSUMPTION_WINDOW_DAYS),
      this.costs.costBySpecialty(tenantId, CONSUMPTION_WINDOW_DAYS),
      this.costs.costByProcedure(tenantId, CONSUMPTION_WINDOW_DAYS),
    ]);

    return {
      total30d: toCents(byDay.reduce((sum, d) => sum + d.total, 0)),
      byDay,
      bySpecialty: bySpecialty
        .filter((s) => s.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, TOP_SIZE),
      // AVERAGE cost per procedure is the number a dentist looks for ("how much
      // does a restoration cost me?"); the total alone only reflects how many
      // were performed.
      byProcedure: byProcedure
        .filter((p) => p.executions > 0 && p.total > 0)
        .map((p) => ({ ...p, average: toCents(p.total / p.executions) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, TOP_SIZE),
      materialsWithoutCost: materials.filter((m) => m.unitCost === null).length,
    };
  }
}
