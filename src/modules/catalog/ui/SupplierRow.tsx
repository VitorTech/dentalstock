"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import type { Material, Supplier } from "@/modules/catalog/domain";

export default function SupplierRow({
  supplier,
  linkedMaterials,
  allMaterials,
  onLink,
  onUpdate,
  onDelete,
}: {
  supplier: Supplier;
  linkedMaterials: { id: string; name: string }[];
  allMaterials: Material[];
  onLink: (materialId: string, supplierId: string | null) => Promise<void> | void;
  onUpdate: (id: string, data: Partial<Supplier>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [notes, setNotes] = useState(supplier.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const dirty =
    name !== supplier.name ||
    phone !== (supplier.phone ?? "") ||
    email !== (supplier.email ?? "") ||
    notes !== (supplier.notes ?? "");

  const linkedIds = useMemo(() => new Set(linkedMaterials.map((m) => m.id)), [linkedMaterials]);

  const available = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return allMaterials
      .filter((m) => !linkedIds.has(m.id))
      .filter((m) => (q ? m.name.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [allMaterials, linkedIds, pickerQuery]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onUpdate(supplier.id, { name: name.trim(), phone, email, notes });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-3 rounded-2xl px-3 py-4 transition-colors duration-200 hover:bg-canvas">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-subink">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-subink">Telefone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-subink">E-mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@fornecedor.com"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-subink">Observações</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: prazo de entrega"
              className={inputClass}
            />
          </label>
        </div>

        <button
          onClick={() => onDelete(supplier.id)}
          aria-label={`Excluir fornecedor ${supplier.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-subink transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Materiais vinculados */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-medium text-subink">
            {linkedMaterials.length === 0
              ? "Nenhum material vinculado"
              : `${linkedMaterials.length} ${linkedMaterials.length === 1 ? "material vinculado" : "materiais vinculados"}`}
          </span>
          <div className="flex items-center gap-2">
            {saved && <span className="text-[12px] font-medium text-success">Salvo</span>}
            <button
              onClick={handleSave}
              disabled={!dirty || saving || !name.trim()}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
            >
              {saving ? <Spinner size={14} /> : <Check size={14} />} {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {linkedMaterials.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1 rounded-full border border-hairline bg-canvas py-1 pl-2.5 pr-1 text-[12px] text-subink"
            >
              {m.name}
              <button
                onClick={() => onLink(m.id, null)}
                aria-label={`Desvincular ${m.name}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-subink transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          <button
            onClick={() => setShowPicker((v) => !v)}
            className={`flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-[12px] font-medium transition-colors ${
              showPicker
                ? "border-accent text-accent"
                : "border-hairline text-accent hover:bg-accent-soft"
            }`}
          >
            <Plus size={12} /> Vincular material
          </button>
        </div>

        {/* Seletor de materiais */}
        {showPicker && (
          <div className="mt-1 rounded-xl border border-hairline bg-surface p-3">
            <input
              autoFocus
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Buscar material para vincular…"
              className="mb-2 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
            />
            <div className="max-h-52 overflow-y-auto rounded-lg border border-hairline">
              {available.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-subink">
                  {allMaterials.length === linkedMaterials.length
                    ? "Todos os materiais já estão vinculados a este fornecedor."
                    : "Nenhum material encontrado."}
                </p>
              ) : (
                available.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onLink(m.id, supplier.id)}
                    className="flex w-full items-center justify-between gap-3 border-b border-hairline px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{m.name}</span>
                    {m.supplierId && m.supplierId !== supplier.id && m.supplier ? (
                      <span className="shrink-0 text-[11px] text-subink">de: {m.supplier.name}</span>
                    ) : null}
                    <Plus size={14} className="shrink-0 text-accent" />
                  </button>
                ))
              )}
            </div>
            <p className="mt-2 text-[11px] text-subink">
              Um material tem apenas um fornecedor principal — vincular aqui move o material para este fornecedor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
