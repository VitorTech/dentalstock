"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleCheck, Stethoscope, TriangleAlert, X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import { fmtMoney } from "@/shared/ui/format";
import type { Material } from "@/modules/catalog/domain";
import type { ShortageDetail } from "@/modules/clinical/domain";
import { finalizeSession } from "./api";

export interface SessionEntry {
  procedureId: string;
  procedureName: string;
  materials: { materialId: string; quantity: number }[];
  estimatedCost: number | null;
}

interface SessionContextValue {
  entries: SessionEntry[];
  has: (procedureId: string) => boolean;
  toggle: (entry: SessionEntry) => void;
  clear: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Consulta em andamento: procedimentos marcados para finalizar juntos.
 *
 * Vive em contexto, e não em props, porque o card do procedimento está três
 * camadas abaixo da página (especialidade → lista → item). Passar a seleção
 * por props obrigaria as duas camadas do meio a conhecer um assunto que não é
 * delas.
 */
export function ProcedureSessionProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<SessionEntry[]>([]);

  const has = useCallback(
    (procedureId: string) => entries.some((e) => e.procedureId === procedureId),
    [entries]
  );

  const toggle = useCallback((entry: SessionEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.procedureId === entry.procedureId);
      // Marcar de novo ATUALIZA em vez de duplicar: o dentista pode ajustar a
      // quantidade depois de incluir o procedimento na consulta.
      if (exists) return prev.filter((e) => e.procedureId !== entry.procedureId);
      return [...prev, entry];
    });
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo(() => ({ entries, has, toggle, clear }), [entries, has, toggle, clear]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useProcedureSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useProcedureSession precisa estar dentro de ProcedureSessionProvider.");
  }
  return context;
}

type BarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; procedures: number; cost: number | null }
  | { status: "insufficient"; items: ShortageDetail[] }
  | { status: "error"; message: string };

/**
 * Barra flutuante da consulta.
 *
 * Só aparece com dois ou mais procedimentos marcados: com um só, o botão do
 * próprio card já resolve, e uma barra fixa na tela seria ruído.
 */
export function ProcedureSessionBar({
  canSeeCosts,
  onFinalized,
}: {
  canSeeCosts: boolean;
  onFinalized: (materials: Material[]) => void;
}) {
  const { entries, clear } = useProcedureSession();
  const [state, setState] = useState<BarState>({ status: "idle" });

  if (entries.length < 2 && state.status !== "success") return null;

  const knownCosts = entries.map((e) => e.estimatedCost).filter((c): c is number => c !== null);
  const totalCost = knownCosts.length > 0 ? knownCosts.reduce((a, b) => a + b, 0) : null;

  const finalize = async () => {
    setState({ status: "loading" });

    const outcome = await finalizeSession(
      entries.map((e) => ({ procedureId: e.procedureId, materials: e.materials }))
    );

    // Estoque insuficiente e falha de rede já vêm no formato do estado da barra.
    if (outcome.status !== "ok") {
      setState(outcome);
      return;
    }

    onFinalized(outcome.materials);
    setState({ status: "success", procedures: outcome.count, cost: outcome.cost });
    clear();
    window.setTimeout(() => setState({ status: "idle" }), 4000);
  };

  if (state.status === "success") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5">
        <div className="flex items-center gap-2 rounded-full bg-success px-5 py-3 text-[14px] font-medium text-white shadow-pop animate-fadeIn">
          <CircleCheck size={17} />
          {state.procedures} {state.procedures === 1 ? "procedimento" : "procedimentos"} finalizados
          {canSeeCosts && state.cost !== null && ` · ${fmtMoney(state.cost)}`}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl2 border border-hairline bg-surface shadow-pop animate-fadeIn">
        {state.status === "insufficient" && (
          <div className="flex items-start gap-2 border-b border-hairline bg-danger-soft px-4 py-3 text-[12.5px] text-danger">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Estoque insuficiente. Nada foi descontado.</p>
              <ul className="mt-0.5">
                {state.items.map((item) => (
                  <li key={item.materialId}>
                    {item.name}: precisa de {item.requested} {item.unit}, há {item.available}{" "}
                    {item.unit}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-center gap-2 border-b border-hairline bg-danger-soft px-4 py-2.5 text-[12.5px] text-danger">
            <TriangleAlert size={15} className="shrink-0" /> {state.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
              <Stethoscope size={15} className="text-accent" />
              Consulta com {entries.length} procedimentos
            </p>
            <p className="mt-0.5 truncate text-[12px] text-subink">
              {entries.map((e) => e.procedureName).join(" · ")}
              {canSeeCosts && totalCost !== null && ` — ${fmtMoney(totalCost)}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={clear}
              aria-label="Limpar consulta"
              className="flex h-9 w-9 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
            >
              <X size={17} />
            </button>
            <button
              onClick={finalize}
              disabled={state.status === "loading"}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
            >
              {state.status === "loading" && <Spinner size={15} />}
              {state.status === "loading" ? "Finalizando…" : "Finalizar consulta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
