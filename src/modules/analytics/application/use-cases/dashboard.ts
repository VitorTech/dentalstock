/**
 * Caso de uso do painel.
 *
 * O painel não tem porta nem adaptador próprios: compõe os relatórios que cada
 * módulo expõe sobre os próprios dados — consumo (estoque), custo (atendimento)
 * e cadastro (catálogo). A agregação pesada continua no banco; aqui só se
 * combinam os resultados e se aplicam as regras de apresentação — por exemplo,
 * o ranking usa consumo REAL, então clínica que nunca finalizou procedimento
 * aparece zerada em vez de exibir demanda teórica.
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
  /** Materiais vencidos ou perto de vencer, os vencidos primeiro. */
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
   * Bloco de custo. `null` quando o papel não pode ver valores — omitir do DTO
   * é mais seguro do que mandar e esconder na tela.
   */
  cost: {
    total30d: number;
    byDay: { date: string; total: number }[];
    bySpecialty: { name: string; total: number }[];
    byProcedure: { name: string; total: number; executions: number; average: number }[];
    /** Materiais sem preço cadastrado — o total é parcial enquanto houver. */
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

    // Mais crítico primeiro: quem está mais abaixo do mínimo aparece no topo.
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

    // Vencido antes de "vence em breve": é o que precisa sair da prateleira hoje.
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
      // Custo MÉDIO por procedimento é o número que o dentista procura
      // ("quanto me custa uma restauração?"); o total sozinho só reflete quantos
      // foram feitos.
      byProcedure: byProcedure
        .filter((p) => p.executions > 0 && p.total > 0)
        .map((p) => ({ ...p, average: toCents(p.total / p.executions) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, TOP_SIZE),
      materialsWithoutCost: materials.filter((m) => m.unitCost === null).length,
    };
  }
}
