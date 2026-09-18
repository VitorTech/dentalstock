"use client";

/**
 * Clinical operations available to the screens: finalization (single or for an
 * appointment with several procedures), history and reversal.
 *
 * Finalization has a detail that is not an error: the 409 is an EXPECTED
 * result — it means the whole transaction was refused for lack of stock, and
 * the response carries what was missing. That is why it does not use
 * `apiSend`, which would treat any non-2xx as a failure with no useful body.
 */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { Material } from "@/modules/catalog/domain";
import type { ShortageDetail } from "@/modules/clinical/domain";

// ── Finalization ───────────────────────────────────────────────────────────

/** A procedure and what it consumes, as the screen assembles it. */
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

/** Finalizes a single procedure. */
export const finalizeProcedure = (entry: FinalizeEntry) => postFinalize(entry);

/** Finalizes the whole appointment: one transaction for every procedure. */
export const finalizeSession = (entries: FinalizeEntry[]) =>
  postFinalize({ procedures: entries });

// ── History ────────────────────────────────────────────────────────────────

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

/** Returns the materials to stock and marks the execution as reversed. */
export const reverseExecution = (executionId: string) =>
  apiSend(`/api/history/${executionId}/reverse`, "POST");

/**
 * Address of the CSV. It is a navigation link, not a `fetch`: the browser
 * performs the download, handling the file name and the progress itself.
 */
export const historyExportUrl = (filters: { query: string; days: number }) =>
  `/api/history/export?q=${encodeURIComponent(filters.query)}&days=${filters.days}`;
