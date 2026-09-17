"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import MaterialImage from "./MaterialImage";
import type { Material } from "@/modules/catalog/domain";
import { ApiError } from "@/shared/ui/api-client";
import { createMaterial } from "./api";

const COMMON_UNITS = ["un", "par", "ml", "g", "kg", "l", "tubete", "rolete"];

export default function AddMaterialModal({
  allMaterials,
  excludeIds,
  onClose,
  onAdd,
  onMaterialCreated,
}: {
  allMaterials: Material[];
  excludeIds: string[];
  onClose: () => void;
  onAdd: (materialId: string, quantity: number) => Promise<void> | void;
  onMaterialCreated: (material: Material) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const options = useMemo(() => {
    const available = allMaterials.filter((m) => !excludeIds.includes(m.id));
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter((m) => m.name.toLowerCase().includes(q));
  }, [allMaterials, excludeIds, query]);

  const selected = allMaterials.find((m) => m.id === selectedId);

  const handleSubmit = async () => {
    if (!selectedId || quantity <= 0) return;
    setSubmitting(true);
    await onAdd(selectedId, quantity);
    setSubmitting(false);
  };

  const handleCreated = (material: Material) => {
    onMaterialCreated(material);
    setShowCreateForm(false);
    setQuery("");
    setSelectedId(material.id);
    setQuantity(1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl3 bg-surface p-6 shadow-pop animate-fadeIn"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-ink">
            {showCreateForm ? "Novo material" : "Adicionar material"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {showCreateForm ? (
          <CreateMaterialForm
            initialName={query}
            onCancel={() => setShowCreateForm(false)}
            onCreated={handleCreated}
          />
        ) : (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder="Buscar material…"
              className="mb-3 w-full rounded-full border border-hairline bg-canvas px-4 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-accent"
            />

            <div className="mb-3 max-h-56 overflow-y-auto rounded-2xl border border-hairline">
              {options.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13.5px] text-subink">
                  Nenhum material encontrado{query ? ` para "${query}"` : ""}.
                </p>
              ) : (
                options.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`flex w-full items-center gap-3 border-b border-hairline px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                      selectedId === m.id ? "bg-accent-soft" : "hover:bg-canvas"
                    }`}
                  >
                    <MaterialImage material={m} size={32} />
                    <span
                      className={`min-w-0 flex-1 break-words text-[13.5px] ${
                        selectedId === m.id ? "text-accent" : "text-ink"
                      }`}
                    >
                      {m.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-subink">
                      {m.stock} {m.unit} disp.
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-hairline py-2.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              <Plus size={14} />
              {query ? `Cadastrar "${query}" como novo material` : "Cadastrar novo material"}
            </button>

            {selected && (
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                <span className="text-[13.5px] font-medium text-ink">Quantidade necessária</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-16 rounded-lg border border-hairline bg-surface px-2 py-1 text-center text-[13.5px] outline-none focus:border-accent"
                  />
                  <span className="text-[13px] text-subink">{selected.unit}</span>
                </div>
              </div>
            )}

            <button
              disabled={!selectedId || quantity <= 0 || submitting}
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-[14.5px] font-medium text-white transition-all duration-200 ease-apple hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
            >
              {submitting && <Spinner size={16} />}
              {submitting ? "Adicionando…" : "Adicionar ao procedimento"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function CreateMaterialForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (material: Material) => void;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState("un");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const previewMaterial = { name: name || "Novo material", imageUrl: imageUrl || null };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || !unit.trim()) {
      setError("Nome e unidade são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      onCreated(
        await createMaterial({
          name: name.trim(),
          unit: unit.trim(),
          category: category.trim() || null,
          imageUrl: imageUrl.trim() || null,
          stock,
          minStock,
        })
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível cadastrar o material.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
        <MaterialImage material={previewMaterial} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink">
            {name || "Pré-visualização"}
          </p>
          <p className="text-[12px] text-subink">
            {imageUrl ? "Usando imagem informada" : "Sem imagem — usaremos um ícone padrão"}
          </p>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[12.5px] font-medium text-subink">Nome do material</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Cimento Cirúrgico"
          className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[12.5px] font-medium text-subink">Unidade</span>
          <input
            list="unit-suggestions"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="un, ml, g…"
            className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
          <datalist id="unit-suggestions">
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[12.5px] font-medium text-subink">Categoria (opcional)</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: Cirúrgico"
            className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[12.5px] font-medium text-subink">Estoque inicial</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={stock}
            onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
            className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[12.5px] font-medium text-subink">Estoque mínimo</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={minStock}
            onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
            className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[12.5px] font-medium text-subink">URL da imagem (opcional)</span>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
        />
      </label>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="mt-1 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full px-3.5 py-2.5 text-[13.5px] font-medium text-subink transition-colors hover:bg-canvas"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-hairline disabled:text-subink"
        >
          {submitting && <Spinner size={14} />}
          {submitting ? "Salvando…" : "Cadastrar material"}
        </button>
      </div>
    </div>
  );
}
