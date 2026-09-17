"use client";

import { useEffect, useState } from "react";
import type { Material, ProcedureMaterial } from "@/modules/catalog/domain";
import { finalizeProcedure } from "../api";
import type { ShortageDetail } from "@/modules/clinical/domain";

export type FinalizeState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "loading" }
  | { status: "success"; cost: number | null }
  | { status: "insufficient"; items: ShortageDetail[] }
  | { status: "error"; message: string };

/** Tempo em que o aviso de sucesso fica na tela antes de voltar ao botão. */
const SUCCESS_VISIBLE_MS = 2600;

/**
 * Máquina de estados da finalização de um procedimento avulso.
 *
 * O 409 é um resultado esperado, não um erro: significa que a transação foi
 * recusada inteira por falta de estoque, e a tela lista exatamente o que faltou.
 */
export function useFinalizeProcedure({
  procedureId,
  materials,
  onStockUpdated,
}: {
  procedureId: string;
  materials: ProcedureMaterial[];
  /** Recebe os saldos atualizados de cada material descontado. */
  onStockUpdated: (materials: Material[]) => void;
}) {
  const [state, setState] = useState<FinalizeState>({ status: "idle" });

  useEffect(() => {
    if (state.status !== "success") return;
    const t = setTimeout(() => setState({ status: "idle" }), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [state]);

  const finalize = async () => {
    setState({ status: "loading" });

    const outcome = await finalizeProcedure({
      procedureId,
      materials: materials.map((m) => ({ materialId: m.materialId, quantity: m.quantity })),
    });

    if (outcome.status === "ok") {
      onStockUpdated(outcome.materials);
      setState({ status: "success", cost: outcome.cost });
      return;
    }
    setState(outcome);
  };

  return {
    state,
    finalize,
    requestConfirmation: () => setState({ status: "confirming" }),
    cancel: () => setState({ status: "idle" }),
  };
}
