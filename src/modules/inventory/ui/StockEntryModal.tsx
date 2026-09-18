"use client";

import { useState } from "react";
import { PackagePlus, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import { fmtMoney, fmtQty } from "@/shared/ui/format";
import type { Material } from "@/modules/catalog/domain";
import { ApiError } from "@/shared/ui/api-client";
import { useAdjustStock, useRegisterEntry } from "./queries";

type Mode = "entry" | "adjust";

/**
 * Stock entry and adjustment.
 *
 * Two modes of the same dialog, with deliberately distinct semantics:
 * **entry** ADDS what arrived (it is a purchase), **adjustment** SETS the
 * correct balance (it is a correction) and requires a reason. Merging the two
 * into a single "new stock" field is what made the system lose track of
 * everything that came in.
 */
export default function StockEntryModal({
  material,
  mode: initialMode,
  canSeeCosts,
  canAdjust,
  onClose,
  onSaved,
}: {
  material: Material;
  mode: Mode;
  canSeeCosts: boolean;
  canAdjust: boolean;
  onClose: () => void;
  /** The caller only closes itself: the updated balances arrive through the cache. */
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [newStock, setNewStock] = useState(String(material.stock));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const entry = useRegisterEntry();
  const adjust = useAdjustStock();
  const saving = entry.isPending || adjust.isPending;

  const parsedQuantity = parseFloat(quantity.replace(",", "."));
  const parsedStock = parseFloat(newStock.replace(",", "."));
  const parsedCost = unitCost.trim() === "" ? null : parseFloat(unitCost.replace(",", "."));

  const valid =
    mode === "entry"
      ? Number.isFinite(parsedQuantity) && parsedQuantity > 0
      : Number.isFinite(parsedStock) && parsedStock >= 0 && reason.trim().length >= 3;

  const handleSubmit = async () => {
    setError(null);
    try {
      if (mode === "entry") {
        await entry.mutateAsync({
          materialId: material.id,
          quantity: parsedQuantity,
          unitCost: parsedCost,
          note: note.trim() || undefined,
        });
      } else {
        await adjust.mutateAsync({
          materialId: material.id,
          stock: parsedStock,
          reason: reason.trim(),
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível registrar.");
    }
  };

  const difference = Number.isFinite(parsedStock) ? parsedStock - material.stock : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl3 bg-surface p-6 shadow-pop animate-fadeIn"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-ink">Movimentar estoque</h3>
            <p className="truncate text-[13px] text-subink">{material.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-[12.5px] text-subink">
          Saldo atual:{" "}
          <span className="font-medium text-ink">
            {fmtQty(material.stock)} {material.unit}
          </span>
          {canSeeCosts && material.unitCost !== null && (
            <> · custo médio {fmtMoney(material.unitCost)}</>
          )}
        </p>

        {canAdjust && (
          <div className="mb-4 flex items-center gap-1 rounded-full bg-canvas p-1">
            <button
              onClick={() => setMode("entry")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === "entry" ? "bg-surface text-ink shadow-sm" : "text-subink hover:text-ink"
              }`}
            >
              <PackagePlus size={14} /> Entrada
            </button>
            <button
              onClick={() => setMode("adjust")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === "adjust" ? "bg-surface text-ink shadow-sm" : "text-subink hover:text-ink"
              }`}
            >
              <SlidersHorizontal size={14} /> Ajuste
            </button>
          </div>
        )}

        {mode === "entry" ? (
          <div className="flex flex-col gap-3">
            <Field label={`Quantidade recebida (${material.unit})`}>
              <input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
              />
            </Field>

            {canSeeCosts && (
              <Field
                label="Custo por unidade (opcional)"
                hint="Informando o preço da nota, o custo médio do material é recalculado."
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
                />
              </Field>
            )}

            <Field label="Observação (opcional)">
              <input
                type="text"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota fiscal, lote, fornecedor…"
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
              />
            </Field>

            {Number.isFinite(parsedQuantity) && parsedQuantity > 0 && (
              <p className="rounded-xl bg-success-soft px-3 py-2 text-[12.5px] text-success">
                Novo saldo: {fmtQty(material.stock + parsedQuantity)} {material.unit}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field
              label={`Saldo correto (${material.unit})`}
              hint="Informe quanto existe de fato. A diferença é registrada no extrato."
            >
              <input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
              />
            </Field>

            <Field label="Motivo do ajuste">
              <input
                type="text"
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: perda por queda, contagem divergente"
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
              />
            </Field>

            {difference !== 0 && Number.isFinite(parsedStock) && (
              <p
                className={`rounded-xl px-3 py-2 text-[12.5px] ${
                  difference > 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}
              >
                Diferença: {difference > 0 ? "+" : ""}
                {fmtQty(difference)} {material.unit}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            <TriangleAlert size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-[13.5px] font-medium text-subink transition-colors hover:bg-canvas hover:text-ink"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!valid || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
          >
            {saving && <Spinner size={15} />}
            {mode === "entry" ? "Registrar entrada" : "Aplicar ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] leading-snug text-subink">{hint}</span>}
    </label>
  );
}
