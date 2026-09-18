"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import { useConfirm } from "@/shared/ui/ConfirmProvider";
import ProcedureList from "./ProcedureList";
import type { Instrument, Material, Procedure } from "@/modules/catalog/domain";

export default function SpecialtyGroup({
  category,
  procedures,
  expanded,
  onToggle,
  allMaterials,
  allInstruments,
  expandedId,
  onToggleProcedure,
  onDeleteProcedure,
  onDeleteSpecialty,
  onProcedureDuplicated,
}: {
  category: string;
  procedures: Procedure[];
  expanded: boolean;
  onToggle: () => void;
  allMaterials: Material[];
  allInstruments: Instrument[];
  expandedId: string | null;
  onToggleProcedure: (id: string) => void;
  onDeleteProcedure: (id: string) => Promise<void> | void;
  onDeleteSpecialty: () => Promise<void> | void;
  onProcedureDuplicated: (procedure: Procedure) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirm();

  const handleDeleteSpecialty = async () => {
    const n = procedures.length;
    const ok = await confirm({
      title: `Excluir a especialidade "${category}"?`,
      message: `${n} ${n === 1 ? "procedimento será excluído" : "procedimentos serão excluídos"}. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir tudo",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await onDeleteSpecialty();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-xl2 border border-hairline bg-surface transition-shadow duration-300 ease-apple ${
        expanded ? "shadow-cardHover" : "shadow-card hover:shadow-cardHover"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-[17px] font-semibold text-ink">{category}</h2>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-accent">
            {procedures.length}
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-subink transition-transform duration-300 ease-apple ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="animate-expand origin-top border-t border-hairline bg-canvas/60 px-4 pb-4 pt-4">
          <ProcedureList
            procedures={procedures}
            allMaterials={allMaterials}
            allInstruments={allInstruments}
            expandedId={expandedId}
            onToggle={onToggleProcedure}
                onDeleteProcedure={onDeleteProcedure}
            onProcedureDuplicated={onProcedureDuplicated}
          />

          <div className="mt-3 flex justify-center">
            <button
              onClick={handleDeleteSpecialty}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-subink transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
            >
              {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
              {deleting ? "Excluindo…" : "Excluir especialidade"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
