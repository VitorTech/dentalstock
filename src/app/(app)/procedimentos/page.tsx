"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, SearchX, TriangleAlert } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import SearchBar from "@/shared/ui/SearchBar";
import SpecialtyGroup from "@/modules/clinical/ui/SpecialtyGroup";
import CreateProcedureModal from "@/modules/catalog/ui/CreateProcedureModal";
import {
  ProcedureSessionBar,
  ProcedureSessionProvider,
} from "@/modules/clinical/ui/ProcedureSession";
import {
  useDeleteProcedure,
  useInstruments,
  useMaterials,
  useProcedures,
} from "@/modules/catalog/ui/queries";
import { useMe } from "@/modules/identity/ui/queries";
import { isLowStock, type Procedure } from "@/modules/catalog/domain";

/**
 * Background revalidation interval. Sixty seconds is generous for a clinic's
 * stock and cuts the traffic of the previous cycle by four.
 */
const REFRESH_INTERVAL_MS = 60_000;

/** Pause between keystrokes before the search hits the server. */
const SEARCH_DEBOUNCE_MS = 220;

export default function Home() {
  // The provider must wrap this whole screen: both the cards (which mark
  // procedures) and the bar (which finalizes) read the same context.
  return (
    <ProcedureSessionProvider>
      <ProceduresScreen />
    </ProcedureSessionProvider>
  );
}

function ProceduresScreen() {
  const { canManage, canSeeCosts } = useMe();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCreateProcedure, setShowCreateProcedure] = useState(false);

  // Typing is debounced before it becomes a query key, so a five-letter search
  // is one request instead of five cache entries.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data: procedures = [], isLoading: loading } = useProcedures(debouncedQuery);
  const deleteProcedure = useDeleteProcedure();

  /**
   * Material and instrument balances refresh in the background, so the "add"
   * pickers show real stock.
   *
   * Both behaviours below used to be hand-written here: an interval guarded by
   * `document.hidden` plus a `visibilitychange` listener. They came from a
   * measurement — a front desk leaves this screen open all day, and the naive
   * timer produced 480 pairs of requests per hour with nobody looking. The
   * reasoning survives as two options: polling stops while the tab is hidden,
   * and focus revalidates immediately.
   */
  const { data: allMaterials = [] } = useMaterials({ refetchIntervalMs: REFRESH_INTERVAL_MS });
  const { data: allInstruments = [] } = useInstruments({
    refetchIntervalMs: REFRESH_INTERVAL_MS,
  });

  const handleProcedureCreated = (procedure: Procedure) => {
    // Clears the search so the new procedure shows up, and opens its specialty
    // plus the card itself so the user can add materials.
    setQuery("");
    setExpandedCategory(procedure.category?.trim() || "Outros");
    setExpandedId(procedure.id);
    setShowCreateProcedure(false);
  };

  const handleDeleteProcedure = (id: string) => deleteProcedure.mutateAsync(id);

  const handleProcedureDuplicated = (procedure: Procedure) => {
    // Opens the copy right away: renaming and adjusting items is the next step.
    setExpandedCategory(procedure.category?.trim() || "Outros");
    setExpandedId(procedure.id);
  };

  const handleDeleteSpecialty = async (category: string) => {
    const inCategory = procedures.filter((p) => (p.category?.trim() || "Outros") === category);
    await Promise.all(inCategory.map((p) => deleteProcedure.mutateAsync(p.id)));
  };

  const existingCategories = useMemo(
    () =>
      Array.from(
        new Set(procedures.map((p) => p.category?.trim()).filter((c): c is string => !!c))
      ).sort((a, b) => a.localeCompare(b)),
    [procedures]
  );

  const lowStockCount = useMemo(
    () => allMaterials.filter(isLowStock).length,
    [allMaterials]
  );

  const isSearching = query.trim().length > 0;

  const groupedProcedures = useMemo(() => {
    const groups = new Map<string, Procedure[]>();
    for (const p of procedures) {
      const key = p.category?.trim() || "Outros";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Outros") return 1;
      if (b === "Outros") return -1;
      return a.localeCompare(b);
    });
  }, [procedures]);

  return (
    <main className="bg-canvas">
      <SiteHeader>
        {lowStockCount > 0 && (
          <Link
            href="/materiais?status=baixa"
            title="Ver materiais em baixa"
            className="flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-[12.5px] font-medium text-danger transition-colors hover:brightness-95"
          >
            <TriangleAlert size={13} />
            {lowStockCount} {lowStockCount === 1 ? "material" : "materiais"} em baixa
          </Link>
        )}
      </SiteHeader>

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-10 text-center">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Procedimentos por Especialidade
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Selecione uma especialidade para ver os procedimentos. Ao finalizar um procedimento,
            o estoque é atualizado automaticamente.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreateProcedure(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Novo procedimento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-xl2 border border-hairline bg-surface/60"
              />
            ))}
          </div>
        ) : groupedProcedures.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
            <SearchX size={28} className="text-subink" />
            <p className="text-[14.5px] font-medium text-ink">
              {isSearching ? "Nenhum procedimento encontrado" : "Nenhum procedimento cadastrado"}
            </p>
            <p className="max-w-sm text-[13px] text-subink">
              {isSearching
                ? "Tente buscar por outro nome, categoria ou material."
                : "Cadastre o primeiro procedimento para começar."}
            </p>
            {!isSearching && (
              <button
                onClick={() => setShowCreateProcedure(true)}
                className="mt-1 flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <Plus size={15} /> Novo procedimento
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedProcedures.map(([category, procs]) => (
              <SpecialtyGroup
                key={category}
                category={category}
                procedures={procs}
                expanded={isSearching || expandedCategory === category}
                onToggle={() =>
                  setExpandedCategory((cur) => (cur === category ? null : category))
                }
                allMaterials={allMaterials}
                allInstruments={allInstruments}
                expandedId={expandedId}
                onToggleProcedure={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                onDeleteProcedure={handleDeleteProcedure}
                onDeleteSpecialty={() => handleDeleteSpecialty(category)}
                onProcedureDuplicated={handleProcedureDuplicated}
              />
            ))}
          </div>
        )}
      </section>

      <ProcedureSessionBar canSeeCosts={canSeeCosts} />

      {showCreateProcedure && (
        <CreateProcedureModal
          categories={existingCategories}
          onClose={() => setShowCreateProcedure(false)}
          onCreated={handleProcedureCreated}
        />
      )}
    </main>
  );
}
