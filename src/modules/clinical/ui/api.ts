"use client";

/**
 * Operações clínicas disponíveis às telas: finalização (avulsa ou de consulta
 * com vários procedimentos), histórico e estorno.
 *
 * A finalização tem um detalhe que não é erro: o 409 é resultado ESPERADO —
 * significa que a transação inteira foi recusada por falta de estoque, e a
 * resposta traz o que faltou. Por isso ela não usa `apiSend`, que trataria
 * qualquer não-2xx como falha sem corpo útil.
 */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { Material } from "@/modules/catalog/domain";
import type { ShortageDetail } from "@/modules/clinical/domain";

// ── Finalização ────────────────────────────────────────────────────────────

/** Um procedimento e o que ele consome, como a tela monta. */
export interface FinalizeEntry {
  procedureId: string;
  materials: { materialId: string; quantity: number }[];
}

export type FinalizeOutcome =
  | { status: "ok"; materials: Material[]; cost: number | null; count: number }
  | { status: "insufficient"; items: ShortageDetail[] }
  | { status: "error"; message: string };

async function postFinalize(body: unknown): Promise<FinalizeOutcome> {
  try {
    const res = await fetch("/api/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.status === 409) return { status: "insufficient", items: data.insufficient ?? [] };
    if (!res.ok) return { status: "error", message: data.error ?? "Erro inesperado." };

    return {
      status: "ok",
      materials: (data.materials ?? []) as Material[],
      cost: data.cost ?? null,
      count: data.count ?? 1,
    };
  } catch {
    return { status: "error", message: "Falha de conexão com o servidor." };
  }
}

/** Finaliza um procedimento avulso. */
export const finalizeProcedure = (entry: FinalizeEntry) => postFinalize(entry);

/** Finaliza a consulta inteira: uma transação para todos os procedimentos. */
export const finalizeSession = (entries: FinalizeEntry[]) =>
  postFinalize({ procedures: entries });

// ── Histórico ──────────────────────────────────────────────────────────────

export interface ExecutionItemLine {
  id: string;
  kind: string;
  name: string;
  quantity: number;
  unit: string | null;
  unitCost: number | null;
}

export interface ExecutionView {
  id: string;
  procedureName: string;
  category: string | null;
  createdAt: string;
  items: ExecutionItemLine[];
  userName: string | null;
  sessionId: string | null;
  reversedAt: string | null;
  reversedByName: string | null;
  totalCost: number | null;
}

export interface HistoryPage {
  executions: ExecutionView[];
  total: number;
  hasMore: boolean;
}

export async function listHistory(filters: {
  page: number;
  query: string;
  days: number;
}): Promise<HistoryPage> {
  const query = new URLSearchParams({
    page: String(filters.page),
    q: filters.query,
    days: String(filters.days),
  });

  const data = await apiGet<Partial<HistoryPage>>(`/api/history?${query}`, {});
  return {
    executions: Array.isArray(data.executions) ? data.executions : [],
    total: data.total ?? 0,
    hasMore: Boolean(data.hasMore),
  };
}

/** Devolve os materiais ao estoque e marca a execução como estornada. */
export const reverseExecution = (executionId: string) =>
  apiSend(`/api/history/${executionId}/reverse`, "POST");

/**
 * Endereço do CSV. É um link de navegação, não um `fetch`: o download é feito
 * pelo próprio navegador, que cuida do nome do arquivo e do progresso.
 */
export const historyExportUrl = (filters: { query: string; days: number }) =>
  `/api/history/export?q=${encodeURIComponent(filters.query)}&days=${filters.days}`;
