"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, CalendarClock, Plus, ScrollText, TriangleAlert, X } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import SearchBar from "@/shared/ui/SearchBar";
import MaterialStockRow from "@/modules/inventory/ui/MaterialStockRow";
import { CreateMaterialForm } from "@/modules/catalog/ui/AddMaterialModal";
import ErrorBanner from "@/shared/ui/ErrorBanner";
import { ApiError } from "@/shared/ui/api-client";
import type { MaterialPatch } from "@/modules/catalog/ui/api";
import { useMaterials, useSuppliers, useUpdateMaterial } from "@/modules/catalog/ui/queries";
import { useMe } from "@/modules/identity/ui/queries";
import FilterChip from "@/shared/ui/FilterChip";
import { isLowStock } from "@/modules/catalog/domain";
import { needsExpiryAttention } from "@/modules/inventory/domain";

type Filter = "all" | "low" | "expiring";

export default function MateriaisPage() {
  const { canManage, canSeeCosts } = useMe();
  const { data: materials = [], isLoading: loading } = useMaterials();
  const { data: suppliers = [] } = useSuppliers();
  const updateMaterial = useUpdateMaterial();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Turns the filter on automatically when arriving from the header notice
    // (/materiais?status=baixa or ?status=validade).
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "baixa") setFilter("low");
    if (status === "validade") setFilter("expiring");
  }, []);

  const filtered = useMemo(() => {
    let list = materials;
    if (filter === "low") list = list.filter(isLowStock);
    if (filter === "expiring") list = list.filter((m) => needsExpiryAttention(m));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [materials, query, filter]);

  const lowStockCount = useMemo(
    () => materials.filter(isLowStock).length,
    [materials]
  );
  const expiringCount = useMemo(() => materials.filter((m) => needsExpiryAttention(m)).length, [materials]);

  /** Shows the server message: a write that fails silently misleads the user. */
  const report = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : "Não foi possível concluir a operação.");

  const handleUpdate = async (id: string, patch: MaterialPatch) => {
    setError(null);
    try {
      await updateMaterial.mutateAsync({ id, patch });
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
            <Boxes size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Materiais
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Registre entradas, acompanhe validade e mantenha o estoque conferido.
          </p>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} placeholder="Buscar material ou categoria…" />
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Novo material</span>
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {lowStockCount > 0 && (
            <FilterChip
              active={filter === "low"}
              tone="danger"
              onClick={() => setFilter(filter === "low" ? "all" : "low")}
            >
              <TriangleAlert size={14} /> Em baixa ({lowStockCount})
              {filter === "low" && <X size={13} />}
            </FilterChip>
          )}
          {expiringCount > 0 && (
            <FilterChip
              active={filter === "expiring"}
              tone="warn"
              onClick={() => setFilter(filter === "expiring" ? "all" : "expiring")}
            >
              <CalendarClock size={14} /> Validade ({expiringCount})
              {filter === "expiring" && <X size={13} />}
            </FilterChip>
          )}
          <Link
            href="/movimentacoes"
            className="flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-[13px] font-medium text-subink transition-colors hover:bg-surface hover:text-ink"
          >
            <ScrollText size={14} /> Extrato
          </Link>
        </div>

        <ErrorBanner message={error} />

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-xl2 border border-hairline bg-surface/60"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
            <Boxes size={28} className="text-subink" />
            <p className="text-[14.5px] font-medium text-ink">Nenhum material encontrado</p>
            <p className="max-w-sm text-[13px] text-subink">
              Tente buscar por outro nome ou categoria.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-hairline/60 rounded-xl2 border border-hairline bg-surface shadow-card">
            {filtered.map((m) => (
              <MaterialStockRow
                key={m.id}
                material={m}
                suppliers={suppliers}
                canManage={canManage}
                canSeeCosts={canSeeCosts}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </section>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl3 bg-surface p-6 shadow-pop animate-fadeIn"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-ink">Novo material</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <CreateMaterialForm
              initialName=""
              onCancel={() => setShowCreateModal(false)}
              onCreated={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
