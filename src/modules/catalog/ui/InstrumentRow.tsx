"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import MaterialImage from "./MaterialImage";
import type { ProcedureInstrument } from "@/modules/catalog/domain";

export default function InstrumentRow({
  pi,
  onChangeQuantity,
  onRemove,
}: {
  pi: ProcedureInstrument;
  onChangeQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  const [localQty, setLocalQty] = useState(pi.quantity);

  const commit = (next: number) => {
    if (next <= 0) return;
    setLocalQty(next);
    onChangeQuantity(pi.id, next);
  };

  return (
    <div className="group flex flex-col gap-2 rounded-2xl px-3 py-3 transition-colors duration-200 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MaterialImage material={pi.instrument} size={38} />
        <div className="min-w-0">
          <p className="break-words text-[14.5px] font-medium leading-snug text-ink">{pi.instrument.name}</p>
          {/* Instrumental é reutilizável: a quantidade aqui indica quantos são
              necessários no procedimento, e o estoque NÃO sofre baixa ao
              finalizar. Por isso nada de alertas de "sem estoque" aqui. */}
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-subink">
            <span>{pi.instrument.stock} un cadastradas</span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-normal">
      <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-1.5 py-1 shadow-sm">
        <button
          onClick={() => commit(Math.max(1, localQty - 1))}
          aria-label="Diminuir quantidade"
          className="flex h-6 w-6 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink active:scale-90"
        >
          <Minus size={13} />
        </button>
        <span className="w-14 text-center text-[13.5px] tabular-nums text-ink">
          {localQty} <span className="text-subink">un</span>
        </span>
        <button
          onClick={() => commit(localQty + 1)}
          aria-label="Aumentar quantidade"
          className="flex h-6 w-6 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink active:scale-90"
        >
          <Plus size={13} />
        </button>
      </div>

      <button
        onClick={() => onRemove(pi.id)}
        aria-label={`Remover ${pi.instrument.name} do procedimento`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-subink opacity-100 transition-all duration-200 hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 size={15} />
      </button>
      </div>
    </div>
  );
}
