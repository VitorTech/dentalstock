"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Wrench, Plus, X } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import SearchBar from "@/shared/ui/SearchBar";
import InstrumentStockRow from "@/modules/catalog/ui/InstrumentStockRow";
import { CreateInstrumentForm } from "@/modules/catalog/ui/AddInstrumentModal";
import ErrorBanner from "@/shared/ui/ErrorBanner";
import { ApiError } from "@/shared/ui/api-client";
import { listInstruments, updateInstrument } from "@/modules/catalog/ui/api";
import type { Instrument } from "@/modules/catalog/domain";

export default function InstrumentaisPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInstruments = async () => {
    setInstruments(await listInstruments());
    setLoading(false);
  };

  useEffect(() => {
    loadInstruments();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return instruments;
    const q = query.toLowerCase();
    return instruments.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)
    );
  }, [instruments, query]);

  const handleUpdate = async (id: string, data: { stock: number }) => {
    setError(null);
    try {
      const updated = await updateInstrument(id, data);
      setInstruments((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    }
  };

  const handleCreated = (instrument: Instrument) => {
    setInstruments((prev) => [...prev, instrument].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreateModal(false);
  };

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <Wrench size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Instrumentais
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Controle o inventário de instrumentais da clínica.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-2.5 rounded-xl2 border border-hairline bg-surface px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[13px] leading-relaxed text-subink">
            Instrumentais são <strong className="font-medium text-ink">reutilizáveis</strong>: o
            estoque aqui serve para inventário e reposição, mas{" "}
            <strong className="font-medium text-ink">não sofre baixa</strong> quando um procedimento
            é finalizado — diferente dos materiais de consumo.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} placeholder="Buscar instrumental ou categoria…" />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus size={15} /> Novo instrumental
          </button>
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
            <Wrench size={28} className="text-subink" />
            <p className="text-[14.5px] font-medium text-ink">Nenhum instrumental encontrado</p>
            <p className="max-w-sm text-[13px] text-subink">
              Tente buscar por outro nome ou categoria.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-hairline/60 rounded-xl2 border border-hairline bg-surface shadow-card">
            {filtered.map((i) => (
              <InstrumentStockRow key={i.id} instrument={i} onUpdate={handleUpdate} />
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
              <h3 className="text-[17px] font-semibold text-ink">Novo instrumental</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <CreateInstrumentForm
              initialName=""
              onCancel={() => setShowCreateModal(false)}
              onCreated={handleCreated}
            />
          </div>
        </div>
      )}
    </main>
  );
}
