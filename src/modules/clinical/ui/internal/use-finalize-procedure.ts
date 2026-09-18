"use client";

import { useEffect, useState } from "react";
import type { ProcedureMaterial } from "@/modules/catalog/domain";
import { finalizeProcedure } from "../api";
import { useFinalizationInvalidator } from "../queries";
import type { ShortageDetail } from "@/modules/clinical/domain";

export type FinalizeState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "loading" }
  | { status: "success"; cost: number | null }
  | { status: "insufficient"; items: ShortageDetail[] }
  | { status: "error"; message: string };

/** How long the success notice stays on screen before the button returns. */
const SUCCESS_VISIBLE_MS = 2600;

/**
 * State machine for finalizing a single procedure.
 *
 * The 409 is an expected result, not an error: it means the whole transaction
 * was refused for lack of stock, and the screen lists exactly what was missing.
 */
export function useFinalizeProcedure({
  procedureId,
  materials,
}: {
  procedureId: string;
  materials: ProcedureMaterial[];
}) {
  const [state, setState] = useState<FinalizeState>({ status: "idle" });
  const invalidate = useFinalizationInvalidator();

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
      invalidate();
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
