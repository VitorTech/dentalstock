"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Truck } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import SearchBar from "@/shared/ui/SearchBar";
import SupplierRow from "@/modules/catalog/ui/SupplierRow";
import { useConfirm } from "@/shared/ui/ConfirmProvider";
import ErrorBanner from "@/shared/ui/ErrorBanner";
import { ApiError } from "@/shared/ui/api-client";
import {
  deleteSupplier,
  listMaterials,
  listSuppliers,
  updateMaterial,
  updateSupplier,
} from "@/modules/catalog/ui/api";
import type { Material, Supplier } from "@/modules/catalog/domain";
import CreateSupplierModal from "@/modules/catalog/ui/CreateSupplierModal";

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    const [sups, mats] = await Promise.all([listSuppliers(), listMaterials()]);
    setSuppliers(sups);
    setMaterials(mats);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const materialsBySupplier = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const m of materials) {
      if (!m.supplierId) continue;
      const list = map.get(m.supplierId) ?? [];
      list.push({ id: m.id, name: m.name });
      map.set(m.supplierId, list);
    }
    return map;
  }, [materials]);

  const filtered = useMemo(() => {
    if (!query.trim()) return suppliers;
    const q = query.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
    );
  }, [suppliers, query]);

  /** Shows the server message: a write that fails silently misleads the user. */
  const report = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : "Não foi possível concluir a operação.");

  const handleUpdate = async (id: string, data: Partial<Supplier>) => {
    setError(null);
    try {
      const updated = await updateSupplier(id, data);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      report(e);
    }
  };

  const handleDelete = async (id: string) => {
    const sup = suppliers.find((s) => s.id === id);
    const count = materialsBySupplier.get(id)?.length ?? 0;
    const aviso =
      count > 0
        ? `${count} ${count === 1 ? "material perderá" : "materiais perderão"} o vínculo com este fornecedor.`
        : "Esta ação não pode ser desfeita.";
    const ok = await confirm({
      title: `Excluir o fornecedor "${sup?.name}"?`,
      message: aviso,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      // Linked materials lost their supplier (SetNull) — refresh the counts.
      setMaterials((prev) => prev.map((m) => (m.supplierId === id ? { ...m, supplierId: null, supplier: null } : m)));
    } catch (e) {
      report(e);
    }
  };

  const handleCreated = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreate(false);
  };

  // Links (supplierId != null) or unlinks (null) a material, updating local
  // state so chips and counters react immediately.
  const handleLinkMaterial = async (materialId: string, supplierId: string | null) => {
    setError(null);
    try {
      const updated = await updateMaterial(materialId, { supplierId });
      setMaterials((prev) => prev.map((m) => (m.id === materialId ? updated : m)));
    } catch (e) {
      report(e);
    }
  };

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <Truck size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Fornecedores
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Cadastre fornecedores e vincule-os aos materiais em Materiais. Quando o estoque atingir o mínimo, o
            fornecedor aparecerá como sugestão de reposição.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} placeholder="Buscar fornecedor…" />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus size={15} /> Novo fornecedor
          </button>
        </div>

        <ErrorBanner message={error} />

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-xl2 border border-hairline bg-surface/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
            <Truck size={28} className="text-subink" />
            <p className="text-[14.5px] font-medium text-ink">
              {suppliers.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum fornecedor encontrado"}
            </p>
            <p className="max-w-sm text-[13px] text-subink">
              {suppliers.length === 0
                ? 'Clique em "Novo fornecedor" para cadastrar o primeiro.'
                : "Tente buscar por outro nome."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-hairline/60 rounded-xl2 border border-hairline bg-surface shadow-card">
            {filtered.map((s) => (
              <SupplierRow
                key={s.id}
                supplier={s}
                linkedMaterials={materialsBySupplier.get(s.id) ?? []}
                allMaterials={materials}
                onLink={handleLinkMaterial}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateSupplierModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </main>
  );
}
