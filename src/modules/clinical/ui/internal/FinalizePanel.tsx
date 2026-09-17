"use client";

import { CircleCheck, Stethoscope, TriangleAlert } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import { fmtMoney } from "@/shared/ui/format";
import type { FinalizeState } from "./use-finalize-procedure";

/**
 * Rodapé de finalização do card: avisos, confirmação e o atalho para somar o
 * procedimento a uma consulta com vários procedimentos.
 */
export default function FinalizePanel({
  state,
  materialCount,
  canSeeCosts,
  inSession,
  onRequestConfirmation,
  onCancel,
  onConfirm,
  onToggleSession,
}: {
  state: FinalizeState;
  materialCount: number;
  canSeeCosts: boolean;
  inSession: boolean;
  onRequestConfirmation: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onToggleSession: () => void;
}) {
  const plural = materialCount === 1 ? "material" : "materiais";

  return (
    <>
      {state.status === "insufficient" && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Estoque insuficiente. Nada foi descontado.</p>
            <ul className="mt-1 space-y-0.5">
              {state.items.map((it) => (
                <li key={it.materialId}>
                  {it.name}: precisa de {it.requested} {it.unit}, há apenas {it.available}{" "}
                  {it.unit}.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <TriangleAlert size={16} className="shrink-0" />
          {state.message}
        </div>
      )}

      {state.status === "success" ? (
        <div className="flex items-center justify-center gap-2 rounded-full bg-success-soft py-3 text-[14.5px] font-medium text-success animate-fadeIn">
          <CircleCheck size={17} /> Procedimento finalizado
          {canSeeCosts && state.cost !== null
            ? ` — custo ${fmtMoney(state.cost)}`
            : " — estoque atualizado"}
        </div>
      ) : state.status === "confirming" ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
          <p className="text-[13.5px] text-ink">
            Confirmar baixa dos {materialCount} {plural} no estoque?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onCancel}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-subink transition-colors hover:bg-hairline/40"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            disabled={materialCount === 0 || state.status === "loading"}
            onClick={onRequestConfirmation}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-[14.5px] font-medium text-white transition-all duration-200 ease-apple hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
          >
            {state.status === "loading" && <Spinner size={16} />}
            {state.status === "loading" ? "Finalizando…" : "Finalizar procedimento"}
          </button>

          {/* Consulta com mais de um procedimento: marca aqui e finaliza
              tudo de uma vez pela barra flutuante. */}
          <button
            disabled={materialCount === 0}
            onClick={onToggleSession}
            className={`flex w-full items-center justify-center gap-2 rounded-full border py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
              inSession
                ? "border-accent bg-accent-soft text-accent"
                : "border-hairline text-subink hover:bg-canvas hover:text-ink"
            }`}
          >
            <Stethoscope size={14} />
            {inSession ? "Na consulta — remover" : "Somar a outra consulta"}
          </button>
        </div>
      )}
    </>
  );
}
