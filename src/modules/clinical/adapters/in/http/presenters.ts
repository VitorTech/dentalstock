/**
 * Contrato HTTP do atendimento.
 *
 * Concentra a decisão de ocultar custo para quem não pode vê-lo — antes
 * repetida em cada rota que devolvia valores.
 */
import type { Material } from "@/modules/catalog/domain";
import type { ExportRow, FinalizeOutcome } from "@/modules/clinical/application";
import type { ProcedureExecution, ShortageDetail } from "@/modules/clinical/domain";
import { canSeeCosts } from "@/modules/identity/domain";
import type { AuthenticatedActor } from "@/shared/domain";
import { toCsv } from "@/shared/infrastructure/http/csv";

/** 409 da finalização: o pedido é válido, mas conflita com o estoque atual. */
export function toShortageResponse(shortages: ShortageDetail[]) {
  return {
    error: "Estoque insuficiente para um ou mais materiais.",
    insufficient: shortages,
  };
}

export function toFinalizedResponse(
  outcome: Extract<FinalizeOutcome, { ok: true }>,
  materials: Material[],
  actor: AuthenticatedActor
) {
  return {
    ok: true,
    // A interface recarrega os materiais após finalizar.
    materials,
    cost: canSeeCosts(actor.role) ? outcome.cost : null,
    procedures: outcome.procedures,
  };
}

export function toHistoryPageResponse(
  result: { items: ProcedureExecution[]; total: number },
  paging: { page: number; pageSize: number }
) {
  return {
    executions: result.items,
    total: result.total,
    page: paging.page,
    pageSize: paging.pageSize,
    hasMore: paging.page * paging.pageSize < result.total,
  };
}

const fmtDate = (date: Date) =>
  date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Decimal com vírgula: é o que o Excel em português reconhece como número.
const fmtNumber = (value: number | null) =>
  value === null ? "" : String(value).replace(".", ",");

/** Histórico em planilha — uma linha por item, colunas de custo só para quem pode vê-las. */
export function toHistoryCsv(rows: ExportRow[], actor: AuthenticatedActor, now: Date) {
  const showCosts = canSeeCosts(actor.role);

  const headers = [
    "Data",
    "Procedimento",
    "Especialidade",
    "Responsável",
    "Tipo",
    "Item",
    "Quantidade",
    "Unidade",
    ...(showCosts ? ["Custo unitário", "Custo total"] : []),
    "Situação",
  ];

  const csv = toCsv(
    headers,
    rows.map((r) => [
      fmtDate(r.date),
      r.procedure,
      r.category ?? "",
      r.user ?? "",
      r.itemKind,
      r.item,
      fmtNumber(r.quantity),
      r.unit ?? "",
      ...(showCosts ? [fmtNumber(r.unitCost), fmtNumber(r.lineCost)] : []),
      r.reversed ? "Estornado" : "Válido",
    ])
  );

  return { csv, filename: `historico-${now.toISOString().slice(0, 10)}.csv` };
}
