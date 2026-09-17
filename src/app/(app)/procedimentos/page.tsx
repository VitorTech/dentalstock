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
import { deleteProcedure, listInstruments, listMaterials, listProcedures } from "@/modules/catalog/ui/api";
import { useMe } from "@/modules/identity/ui/use-me";
import { isLowStock, type Instrument, type Material, type Procedure } from "@/modules/catalog/domain";

/**
 * Intervalo da revalidação em segundo plano. Sessenta segundos é folgado para
 * um estoque de clínica e reduz em quatro vezes o tráfego do ciclo anterior.
 */
const REFRESH_INTERVAL_MS = 60_000;

export default function Home() {
  // O provedor precisa envolver a árvore inteira desta tela: tanto os cards
  // (que marcam procedimentos) quanto a barra (que finaliza) leem o mesmo
  // contexto.
  return (
    <ProcedureSessionProvider>
      <ProceduresScreen />
    </ProcedureSessionProvider>
  );
}

function ProceduresScreen() {
  const { canManage, canSeeCosts } = useMe();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProcedure, setShowCreateProcedure] = useState(false);

  const loadData = async () => {
    const [procData, matData, instData] = await Promise.all([
      listProcedures(),
      listMaterials(),
      listInstruments(),
    ]);
    setProcedures(procData);
    setAllMaterials(matData);
    setAllInstruments(instData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setProcedures(await listProcedures(query));
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  /**
   * Mantém saldo de material e instrumental atualizados em segundo plano, para
   * os seletores de "adicionar" mostrarem o estoque real.
   *
   * Duas decisões que vieram de medição: a recarga PARA quando a aba não está
   * visível — uma recepção deixa esta tela aberta o dia inteiro, e o relógio
   * antigo gerava 480 pares de requisições por hora com ninguém olhando — e
   * volta a rodar assim que a aba é focada, que é justamente quando o dado
   * desatualizado passaria a importar.
   */
  useEffect(() => {
    const atualizar = async () => {
      if (document.hidden) return;
      setAllMaterials(await listMaterials());
      setAllInstruments(await listInstruments());
    };

    const interval = setInterval(atualizar, REFRESH_INTERVAL_MS);

    // Voltar para a aba revalida na hora, sem esperar o próximo ciclo.
    const aoVoltar = () => {
      if (!document.hidden) atualizar();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  const handleMaterialCreated = (material: Material) => {
    setAllMaterials((prev) =>
      [...prev, material].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleInstrumentCreated = (instrument: Instrument) => {
    setAllInstruments((prev) =>
      [...prev, instrument].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleProcedureCreated = (procedure: Procedure) => {
    // Limpa a busca para o novo procedimento aparecer, e já abre sua
    // especialidade + o próprio card para o usuário adicionar materiais.
    setQuery("");
    setProcedures((prev) =>
      [...prev, procedure].sort((a, b) => a.name.localeCompare(b.name))
    );
    setExpandedCategory(procedure.category?.trim() || "Outros");
    setExpandedId(procedure.id);
    setShowCreateProcedure(false);
  };

  const handleDeleteProcedure = async (id: string) => {
    await deleteProcedure(id);
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const handleProcedureDuplicated = (procedure: Procedure) => {
    setProcedures((prev) => [...prev, procedure].sort((a, b) => a.name.localeCompare(b.name)));
    // Abre a cópia direto: renomear e ajustar os itens é o próximo passo óbvio.
    setExpandedCategory(procedure.category?.trim() || "Outros");
    setExpandedId(procedure.id);
  };

  const handleDeleteSpecialty = async (category: string) => {
    const inCategory = procedures.filter((p) => (p.category?.trim() || "Outros") === category);
    await Promise.all(inCategory.map((p) => deleteProcedure(p.id)));
    setProcedures((prev) =>
      prev.filter((p) => (p.category?.trim() || "Outros") !== category)
    );
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
                onMaterialCreated={handleMaterialCreated}
                onInstrumentCreated={handleInstrumentCreated}
                onDeleteProcedure={handleDeleteProcedure}
                onDeleteSpecialty={() => handleDeleteSpecialty(category)}
                onProcedureDuplicated={handleProcedureDuplicated}
              />
            ))}
          </div>
        )}
      </section>

      <ProcedureSessionBar canSeeCosts={canSeeCosts} onFinalized={setAllMaterials} />

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
