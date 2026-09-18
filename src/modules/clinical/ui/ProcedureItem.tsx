"use client";

import { useState } from "react";
import { ChevronDown, Copy, Info, Plus, Trash2 } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import { useConfirm } from "@/shared/ui/ConfirmProvider";
import { fmtMoney } from "@/shared/ui/format";
import MaterialRow from "@/modules/catalog/ui/MaterialRow";
import AddMaterialModal from "@/modules/catalog/ui/AddMaterialModal";
import InstrumentRow from "@/modules/catalog/ui/InstrumentRow";
import AddInstrumentModal from "@/modules/catalog/ui/AddInstrumentModal";
import { useMe } from "@/modules/identity/ui/use-me";
import type { Instrument, Material, Procedure } from "@/modules/catalog/domain";
import { useProcedureSession } from "./ProcedureSession";
import { useProcedureComposition } from "./internal/use-procedure-composition";
import { useFinalizeProcedure } from "./internal/use-finalize-procedure";
import FinalizePanel from "./internal/FinalizePanel";
import { duplicateProcedure } from "@/modules/catalog/ui/api";

/**
 * A procedure card: composition (materials and instruments), estimated cost
 * and finalization.
 *
 * The card only orchestrates. Talking to the API lives in the
 * `useProcedureComposition` and `useFinalizeProcedure` hooks; the independent
 * visual parts live in `FinalizePanel`.
 */
export default function ProcedureItem({
  procedure,
  allMaterials,
  allInstruments,
  expanded,
  onToggle,
  onMaterialCreated,
  onInstrumentCreated,
  onDelete,
  onDuplicated,
}: {
  procedure: Procedure;
  allMaterials: Material[];
  allInstruments: Instrument[];
  expanded: boolean;
  onToggle: () => void;
  onMaterialCreated: (material: Material) => void;
  onInstrumentCreated: (instrument: Instrument) => void;
  onDelete: () => Promise<void> | void;
  onDuplicated: (procedure: Procedure) => void;
}) {
  const [activeTab, setActiveTab] = useState<"materials" | "instruments">("materials");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddInstrument, setShowAddInstrument] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const confirm = useConfirm();
  const { canManage, canSeeCosts } = useMe();
  const session = useProcedureSession();
  const composition = useProcedureComposition(procedure);
  const { materials, instruments, cost } = composition;

  const finalization = useFinalizeProcedure({
    procedureId: procedure.id,
    materials,
    // The card shows each material's balance: adopt what the server returned.
    onStockUpdated: (updated) =>
      composition.setMaterials((prev) =>
        prev.map((pm) => {
          const material = updated.find((m) => m.id === pm.materialId);
          return material ? { ...pm, material } : pm;
        })
      ),
  });

  const inSession = session.has(procedure.id);

  const toggleSession = () =>
    session.toggle({
      procedureId: procedure.id,
      procedureName: procedure.name,
      materials: materials.map((m) => ({ materialId: m.materialId, quantity: m.quantity })),
      estimatedCost: cost.known > 0 ? cost.total : null,
    });

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      onDuplicated(await duplicateProcedure(procedure.id));
    } catch {
      // Nothing changes on screen: the list simply stays without the copy.
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Excluir "${procedure.name}"?`,
      message:
        "Os vínculos com materiais e instrumentais serão removidos. Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMaterial = async (materialId: string, quantity: number) => {
    if (await composition.addMaterial(materialId, quantity)) setShowAddMaterial(false);
  };

  const handleAddInstrument = async (instrumentId: string, quantity: number) => {
    if (await composition.addInstrument(instrumentId, quantity)) setShowAddInstrument(false);
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
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16px] font-semibold text-ink">{procedure.name}</h3>
            {procedure.category && (
              <span className="hidden shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-medium text-accent sm:inline-block">
                {procedure.category}
              </span>
            )}
          </div>
          {procedure.description && (
            <p className="mt-0.5 truncate text-[13px] text-subink">{procedure.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[12.5px] text-subink">
            {materials.length} {materials.length === 1 ? "material" : "materiais"}
          </span>
          <ChevronDown
            size={18}
            className={`text-subink transition-transform duration-300 ease-apple ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="animate-expand origin-top border-t border-hairline px-5 pb-5 pt-3">
          <div className="mb-3 flex items-center gap-1 rounded-full bg-canvas p-1">
            <TabButton active={activeTab === "materials"} onClick={() => setActiveTab("materials")}>
              Materiais ({materials.length})
            </TabButton>
            <TabButton
              active={activeTab === "instruments"}
              onClick={() => setActiveTab("instruments")}
            >
              Instrumentais ({instruments.length})
            </TabButton>
          </div>

          {activeTab === "materials" ? (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] font-medium uppercase tracking-wide text-subink">
                  Materiais utilizados
                </p>
                <div className="flex items-center gap-1">
                  <AddButton onClick={() => setShowAddMaterial(true)}>Adicionar material</AddButton>
                </div>
              </div>

              {materials.length === 0 ? (
                <EmptyList>Nenhum material associado a este procedimento.</EmptyList>
              ) : (
                <div className="flex flex-col divide-y divide-hairline/60">
                  {materials.map((pm) => (
                    <MaterialRow
                      key={pm.id}
                      pm={pm}
                      onChangeQuantity={composition.changeMaterialQuantity}
                      onRemove={composition.removeMaterial}
                    />
                  ))}
                </div>
              )}

              {canSeeCosts && materials.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5">
                  <span className="text-[12.5px] text-subink">
                    Custo estimado do procedimento
                    {cost.missing > 0 && (
                      <span className="block text-[11.5px]">
                        {cost.missing}{" "}
                        {cost.missing === 1
                          ? "material sem preço cadastrado"
                          : "materiais sem preço cadastrado"}
                        {cost.known > 0 ? " — total parcial" : ""}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                    {cost.known > 0 ? fmtMoney(cost.total) : "—"}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12.5px] font-medium uppercase tracking-wide text-subink">
                  Instrumentais utilizados
                </p>
                <AddButton onClick={() => setShowAddInstrument(true)}>
                  Adicionar instrumental
                </AddButton>
              </div>

              {/* The text sits inside its own <span>: as a direct flex child,
                  each <strong> becomes an item and the sentence breaks up. */}
              <div className="mb-3 flex items-start gap-1.5 rounded-xl bg-canvas px-3 py-2">
                <Info size={13} className="mt-0.5 shrink-0 text-subink" />
                <span className="text-[12px] leading-relaxed text-subink">
                  O estoque dos instrumentais{" "}
                  <strong className="font-medium text-ink">não sofre baixa</strong> ao finalizar o
                  procedimento.
                </span>
              </div>

              {instruments.length === 0 ? (
                <EmptyList>Nenhum instrumental associado a este procedimento.</EmptyList>
              ) : (
                <div className="flex flex-col divide-y divide-hairline/60">
                  {instruments.map((pi) => (
                    <InstrumentRow
                      key={pi.id}
                      pi={pi}
                      onChangeQuantity={composition.changeInstrumentQuantity}
                      onRemove={composition.removeInstrument}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-4 border-t border-hairline pt-4">
            <FinalizePanel
              state={finalization.state}
              materialCount={materials.length}
              canSeeCosts={canSeeCosts}
              inSession={inSession}
              onRequestConfirmation={finalization.requestConfirmation}
              onCancel={finalization.cancel}
              onConfirm={finalization.finalize}
              onToggleSession={toggleSession}
            />

            {canManage && (
              <div className="mt-3 flex flex-wrap justify-center gap-1 border-t border-hairline pt-3">
                <button
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-subink transition-colors hover:bg-canvas hover:text-ink disabled:opacity-60"
                >
                  {duplicating ? <Spinner size={13} /> : <Copy size={13} />}
                  {duplicating ? "Duplicando…" : "Duplicar"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-subink transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                >
                  {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
                  {deleting ? "Excluindo…" : "Excluir procedimento"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddMaterial && (
        <AddMaterialModal
          allMaterials={allMaterials}
          excludeIds={materials.map((m) => m.materialId)}
          onClose={() => setShowAddMaterial(false)}
          onAdd={handleAddMaterial}
          onMaterialCreated={onMaterialCreated}
        />
      )}

      {showAddInstrument && (
        <AddInstrumentModal
          allInstruments={allInstruments}
          excludeIds={instruments.map((i) => i.instrumentId)}
          onClose={() => setShowAddInstrument(false)}
          onAdd={handleAddInstrument}
          onInstrumentCreated={onInstrumentCreated}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-1.5 text-[12.5px] font-medium transition-colors ${
        active ? "bg-surface text-ink shadow-sm" : "text-subink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent-soft"
    >
      <Plus size={13} /> {children}
    </button>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-canvas px-4 py-6 text-center text-[13.5px] text-subink">
      {children}
    </p>
  );
}
