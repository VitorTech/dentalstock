"use client";

import { SearchX } from "lucide-react";
import ProcedureItem from "./ProcedureItem";
import type { Instrument, Material, Procedure } from "@/modules/catalog/domain";

export default function ProcedureList({
  procedures,
  allMaterials,
  allInstruments,
  expandedId,
  onToggle,
  onDeleteProcedure,
  onProcedureDuplicated,
}: {
  procedures: Procedure[];
  allMaterials: Material[];
  allInstruments: Instrument[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onDeleteProcedure: (id: string) => Promise<void> | void;
  onProcedureDuplicated: (procedure: Procedure) => void;
}) {
  if (procedures.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
        <SearchX size={28} className="text-subink" />
        <p className="text-[14.5px] font-medium text-ink">Nenhum procedimento encontrado</p>
        <p className="max-w-sm text-[13px] text-subink">
          Tente buscar por outro nome, categoria ou material.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {procedures.map((p) => (
        <ProcedureItem
          key={p.id}
          procedure={p}
          allMaterials={allMaterials}
          allInstruments={allInstruments}
          expanded={expandedId === p.id}
          onToggle={() => onToggle(p.id)}
          onDelete={() => onDeleteProcedure(p.id)}
          onDuplicated={onProcedureDuplicated}
        />
      ))}
    </div>
  );
}
