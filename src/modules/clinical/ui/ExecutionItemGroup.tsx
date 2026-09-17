"use client";

import type { ReactNode } from "react";
import { fmtMoney, fmtQty } from "@/shared/ui/format";

/** Item de um atendimento como a API de histórico o devolve. */
export type ExecutionItemLine = {
  id: string;
  kind: string;
  name: string;
  quantity: number;
  unit: string | null;
  unitCost: number | null;
};

/** Itens consumidos por um atendimento, agrupados por tipo. */
export default function ItemGroup({
  icon,
  title,
  items,
  vazio,
  showCosts,
}: {
  icon: ReactNode;
  title: string;
  items: ExecutionItemLine[];
  vazio: string;
  showCosts: boolean;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-subink">
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-xl bg-canvas px-3 py-3 text-[12.5px] text-subink">{vazio}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline/60 rounded-xl border border-hairline">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 break-words text-[13.5px] text-ink">{i.name}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-[13px] font-medium tabular-nums text-subink">
                  {fmtQty(i.quantity)} {i.unit ?? ""}
                </span>
                {showCosts && i.unitCost !== null && (
                  <span className="w-16 text-right text-[12.5px] tabular-nums text-subink">
                    {fmtMoney(i.quantity * i.unitCost)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
