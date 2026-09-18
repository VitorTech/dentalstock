"use client";

import { useState } from "react";
import {
  Check,
  CalendarClock,
  ChevronDown,
  PackagePlus,
  PackageX,
  Pencil,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import Spinner from "@/shared/ui/Spinner";
import MaterialImage from "@/modules/catalog/ui/MaterialImage";
import StockEntryModal from "./StockEntryModal";
import { fmtDate, fmtMoney, fmtQty, toDateInput } from "@/shared/ui/format";
import { isLowStock, isOutOfStock, type Material, type Supplier } from "@/modules/catalog/domain";
import { isExpired, isExpiringSoon } from "@/modules/inventory/domain";

function expiryState(material: Material): "none" | "soon" | "expired" {
  if (isExpired(material)) return "expired";
  return isExpiringSoon(material) ? "soon" : "none";
}

export default function MaterialStockRow({
  material,
  suppliers,
  canManage,
  canSeeCosts,
  onUpdate,
}: {
  material: Material;
  suppliers: Supplier[];
  canManage: boolean;
  canSeeCosts: boolean;
  onUpdate: (
    id: string,
    data: {
      minStock?: number;
      supplierId?: string | null;
      unitCost?: number | null;
      expiresAt?: string | null;
    }
  ) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [movingMode, setMovingMode] = useState<"entry" | "adjust" | null>(null);

  const [minStock, setMinStock] = useState(material.minStock);
  const [unitCost, setUnitCost] = useState(
    material.unitCost === null ? "" : String(material.unitCost)
  );
  const [expiresAt, setExpiresAt] = useState(toDateInput(material.expiresAt));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const stockLow = isLowStock(material);
  const stockZero = isOutOfStock(material);
  const expiry = expiryState(material);
  const supplierName = material.supplier?.name;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(material.id, {
        minStock,
        unitCost: unitCost.trim() === "" ? null : parseFloat(unitCost.replace(",", ".")),
        expiresAt: expiresAt === "" ? null : expiresAt,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl px-3 py-3 transition-colors duration-200 hover:bg-canvas">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <MaterialImage material={material} size={40} />
          <div className="min-w-0">
            <p className="text-[14.5px] font-medium text-ink">{material.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-subink">
              {material.category && <span>{material.category}</span>}
              {stockZero ? (
                <Badge tone="danger">Sem estoque</Badge>
              ) : stockLow ? (
                <Badge tone="danger">Estoque baixo</Badge>
              ) : null}
              {expiry === "expired" ? (
                <Badge tone="danger">
                  <CalendarClock size={11} /> Vencido
                </Badge>
              ) : expiry === "soon" ? (
                <Badge tone="warn">
                  <CalendarClock size={11} /> Vence {fmtDate(material.expiresAt!)}
                </Badge>
              ) : null}
              {canSeeCosts && material.unitCost !== null && (
                <span className="tabular-nums">{fmtMoney(material.unitCost)}/{material.unit}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="rounded-lg bg-canvas px-3 py-1.5 text-center">
            <span className="text-[15px] font-semibold tabular-nums text-ink">
              {fmtQty(material.stock)}
            </span>
            <span className="ml-1 text-[12px] text-subink">{material.unit}</span>
          </div>

          <button
            onClick={() => setMovingMode("entry")}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <PackagePlus size={14} /> Entrada
          </button>

          <Link
            href={`/movimentacoes?materialId=${material.id}`}
            title="Ver extrato deste material"
            aria-label="Ver extrato deste material"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-subink transition-colors hover:bg-canvas hover:text-ink"
          >
            <ScrollText size={14} />
          </Link>

          {canManage && (
            <button
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              title="Editar cadastro"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-subink transition-colors hover:bg-canvas hover:text-ink"
            >
              {editing ? <ChevronDown size={14} /> : <Pencil size={13} />}
            </button>
          )}

          {saved && <span className="text-[12px] font-medium text-success">Salvo</span>}
        </div>
      </div>

      {editing && canManage && (
        <div className="animate-expand origin-top rounded-xl border border-hairline bg-canvas/60 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] font-medium text-subink">
                Estoque mínimo ({material.unit})
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={minStock}
                onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[13.5px] outline-none focus:border-accent"
              />
            </label>

            {canSeeCosts && (
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] font-medium text-subink">Custo por unidade</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="R$ 0,00"
                  className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[13.5px] outline-none focus:border-accent"
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] font-medium text-subink">Validade do lote</span>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[13.5px] outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11.5px] font-medium text-subink">Fornecedor</span>
              <select
                value={material.supplierId ?? ""}
                onChange={(e) => onUpdate(material.id, { supplierId: e.target.value || null })}
                className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[13.5px] text-ink outline-none focus:border-accent"
              >
                <option value="">Nenhum</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              onClick={() => setMovingMode("adjust")}
              className="text-[12.5px] font-medium text-subink underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Corrigir saldo
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? <Spinner size={13} /> : <Check size={14} />}
              Salvar cadastro
            </button>
          </div>
        </div>
      )}

      {stockLow && (
        <div className="flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-[12.5px] font-medium text-danger">
          <PackageX size={13} />
          {supplierName
            ? `Contate o fornecedor ${supplierName} para repor o material`
            : "Estoque no mínimo — defina um fornecedor para reposição"}
        </div>
      )}

      {movingMode && (
        <StockEntryModal
          material={material}
          mode={movingMode}
          canSeeCosts={canSeeCosts}
          canAdjust={canManage}
          onClose={() => setMovingMode(null)}
          onSaved={() => setMovingMode(null)}
        />
      )}
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "danger" | "warn";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"
      }`}
    >
      {children}
    </span>
  );
}
