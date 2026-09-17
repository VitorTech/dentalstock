/**
 * Políticas de atendimento: consumo, custo e estorno.
 *
 * Regra central do produto: material é consumido, instrumental não.
 */
import type { Material, Procedure } from "@/modules/catalog/domain";
import { BusinessRuleError, toCents } from "@/shared/domain";
import type { ExecutionItem, ProcedureExecution } from "./entities";

export interface CostSummary {
  /** Custo apurado com os itens que TÊM preço cadastrado. */
  total: number;
  /** Itens sem custo — a tela precisa dizer que o total é parcial. */
  missing: number;
  /** Total de itens considerados. */
  counted: number;
}

/**
 * Custo de um conjunto de itens de execução.
 *
 * Instrumental não entra: ele é reutilizável, então seu preço é investimento em
 * patrimônio, não custo do procedimento. Somá-lo faria uma extração parecer dez
 * vezes mais cara do que é.
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
  /** Quantidades a devolver ao estoque. */
  returns: { materialId: string; quantity: number }[];
}

/**
 * Calcula a devolução de uma execução estornada.
 *
 * Só materiais voltam — instrumental nunca saiu do estoque, então devolvê-lo
 * criaria unidades do nada. Itens cujo material foi excluído depois são
 * ignorados: não há para onde devolver, e o registro histórico permanece.
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
  /** Baixas a aplicar no estoque. */
  deductions: { materialId: string; quantity: number; name: string; unit: string }[];
  /** Itens registrados no histórico (inclui instrumentais, que não baixam). */
  historyItems: {
    kind: "MATERIAL" | "INSTRUMENT";
    name: string;
    quantity: number;
    unit: string | null;
    /** Preservado para o estorno saber a quem devolver. */
    materialId: string | null;
    /** Custo do dia, congelado junto com o nome. */
    unitCost: number | null;
  }[];
  /** Custo do procedimento no momento da finalização. */
  cost: CostSummary;
}

/**
 * Calcula o efeito de finalizar um procedimento, sem tocar em banco.
 *
 * Regra central do produto: **material é consumido, instrumental não**.
 * Instrumental é reutilizável — entra no histórico como checklist do que foi
 * preparado, mas jamais sofre baixa de estoque.
 *
 * Lança BusinessRuleError se algum material não pertencer ao conjunto
 * informado; devolve as faltas para o chamador decidir o que fazer.
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
    // Instrumentais: histórico sim, baixa de estoque não — e, pelo mesmo
    // motivo, custo não: eles voltam para a bancada.
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
