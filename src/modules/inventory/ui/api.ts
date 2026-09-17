"use client";

/**
 * Operações de estoque disponíveis às telas: extrato, entradas, ajustes,
 * lista de compras e balanço.
 *
 * Os tipos aqui são o CONTRATO DE FIO — o que a API devolve em JSON, não a
 * entidade do domínio. A diferença não é burocracia: pelo fio, data vira texto
 * e o custo vem nulo para quem não pode vê-lo. Declarar isso evita a tela
 * acreditar que tem um `Date` onde tem uma string.
 */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { Material } from "@/modules/catalog/domain";
import type { StockMovementType } from "@/modules/inventory/domain";

// ── Extrato ────────────────────────────────────────────────────────────────

export interface StockMovementView {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  type: StockMovementType;
  note: string | null;
  /** Nulo para quem não pode ver custos — removido já no servidor. */
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

// ── Entrada e ajuste ───────────────────────────────────────────────────────

/** Devolve o material com saldo (e custo médio) já atualizados. */
export const registerEntry = (input: {
  materialId: string;
  quantity: number;
  unitCost?: number | null;
  note?: string;
}) => apiSend<Material>("/api/stock/entry", "POST", input);

/** Correção manual de saldo: o motivo é obrigatório e vai para o extrato. */
export const adjustStock = (input: { materialId: string; stock: number; reason: string }) =>
  apiSend<Material>("/api/stock/adjust", "POST", input);
