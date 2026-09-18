"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, ChevronDown, Download, History, RotateCcw, User, Wrench } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import SearchBar from "@/shared/ui/SearchBar";
import Spinner from "@/shared/ui/Spinner";
import { useConfirm } from "@/shared/ui/ConfirmProvider";
import {
  historyExportUrl,
  listHistory,
  reverseExecution,
  type ExecutionView,
} from "@/modules/clinical/ui/api";
import { useMe } from "@/modules/identity/ui/use-me";
import { fmtDateTime, fmtMoney } from "@/shared/ui/format";
import ItemGroup from "@/modules/clinical/ui/ExecutionItemGroup";

const PERIODOS = [
  { label: "Tudo", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

const fmtData = fmtDateTime;
export default function HistoricoPage() {
  const { canManage, canSeeCosts } = useMe();
  const confirm = useConfirm();
  const [reversing, setReversing] = useState<string | null>(null);
  const [executions, setExecutions] = useState<ExecutionView[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, q: string, d: number, append: boolean) => {
      const page = await listHistory({ page: p, query: q, days: d });
      setExecutions((prev) => (append ? [...prev, ...page.executions] : page.executions));
      setTotal(page.total);
      setHasMore(page.hasMore);
    },
    []
  );

  // Search and filters restart pagination.
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setPage(1);
      await load(1, query, days, false);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [query, days, load]);

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    await load(next, query, days, true);
    setPage(next);
    setLoadingMore(false);
  };

  const reverse = async (execution: ExecutionView) => {
    const materiais = execution.items.filter((i) => i.kind === "MATERIAL");
    const ok = await confirm({
      title: `Estornar "${execution.procedureName}"?`,
      message: `${materiais.length} ${
        materiais.length === 1 ? "material volta" : "materiais voltam"
      } para o estoque. O registro não é apagado: fica marcado como estornado.`,
      confirmLabel: "Estornar",
      tone: "danger",
    });
    if (!ok) return;

    setReversing(execution.id);
    try {
      await reverseExecution(execution.id);
      // Mark it locally instead of reloading the list: scroll position and the
      // already loaded pages are preserved.
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === execution.id ? { ...e, reversedAt: new Date().toISOString() } : e
        )
      );
    } catch {
      // A failed reversal leaves the row as it was — the list does not lie.
    } finally {
      setReversing(null);
    }
  };

  const exportUrl = historyExportUrl({ query, days });

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <History size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Histórico
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Procedimentos finalizados, com os materiais e instrumentais utilizados em cada um.
          </p>
        </div>

        <div className="mb-4">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por procedimento, especialidade ou material…"
          />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  days === p.days
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-hairline text-subink hover:bg-canvas hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-[12.5px] text-subink">
                {total} {total === 1 ? "procedimento" : "procedimentos"}
              </span>
            )}
            {total > 0 && (
              <a
                href={exportUrl}
                // `download` makes the browser save the file instead of
                // navigating to the route, which would answer with plain text.
                download
                className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12.5px] font-medium text-subink transition-colors hover:bg-canvas hover:text-ink"
              >
                <Download size={13} /> Exportar
              </a>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-xl2 border border-hairline bg-surface/60"
              />
            ))}
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
            <History size={28} className="text-subink" />
            <p className="text-[14.5px] font-medium text-ink">
              {query || days ? "Nenhum registro encontrado" : "Nenhum procedimento finalizado ainda"}
            </p>
            <p className="max-w-sm text-[13px] text-subink">
              {query || days
                ? "Tente outro termo ou amplie o período."
                : "Ao finalizar um procedimento, ele aparece aqui com tudo que foi utilizado."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {executions.map((e) => {
                const isOpen = expanded === e.id;
                const materiais = e.items.filter((i) => i.kind === "MATERIAL");
                const instrumentais = e.items.filter((i) => i.kind === "INSTRUMENT");
                return (
                  <div
                    key={e.id}
                    className={`overflow-hidden rounded-xl2 border bg-surface transition-shadow duration-300 ease-apple ${
                      e.reversedAt ? "border-hairline opacity-70" : "border-hairline"
                    } ${isOpen ? "shadow-cardHover" : "shadow-card hover:shadow-cardHover"}`}
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : e.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className={`text-[15.5px] font-semibold text-ink ${
                              e.reversedAt ? "line-through decoration-1" : ""
                            }`}
                          >
                            {e.procedureName}
                          </h2>
                          {e.category && (
                            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
                              {e.category}
                            </span>
                          )}
                          {e.reversedAt && (
                            <span className="flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-[11.5px] font-medium text-warn">
                              <RotateCcw size={11} /> Estornado
                            </span>
                          )}
                          {e.sessionId && (
                            <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[11.5px] font-medium text-subink">
                              mesma consulta
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-subink">
                          {fmtData(e.createdAt)} · {materiais.length}{" "}
                          {materiais.length === 1 ? "material" : "materiais"}
                          {instrumentais.length > 0 && ` · ${instrumentais.length} instrumentais`}
                          {e.userName && (
                            <>
                              {" "}
                              · <User size={11} className="inline-block align-[-1px]" />{" "}
                              {e.userName}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {canSeeCosts && e.totalCost !== null && (
                          <span className="text-[14px] font-semibold tabular-nums text-ink">
                            {fmtMoney(e.totalCost)}
                          </span>
                        )}
                        <ChevronDown
                          size={18}
                          className={`text-subink transition-transform duration-300 ease-apple ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="animate-expand origin-top border-t border-hairline px-5 pb-5 pt-4">
                        <ItemGroup
                          icon={<Boxes size={13} />}
                          title="Materiais consumidos"
                          items={materiais}
                          vazio="Nenhum material registrado."
                          showCosts={canSeeCosts}
                        />
                        <div className="mt-4">
                          <ItemGroup
                            icon={<Wrench size={13} />}
                            title="Instrumentais utilizados"
                            items={instrumentais}
                            vazio="Nenhum instrumental registrado neste procedimento."
                            showCosts={false}
                          />
                        </div>

                        {e.reversedAt ? (
                          <p className="mt-4 rounded-xl bg-warn-soft px-3 py-2.5 text-[12.5px] text-warn">
                            Estornado em {fmtData(e.reversedAt)}
                            {e.reversedByName && ` por ${e.reversedByName}`}. Os materiais voltaram
                            ao estoque.
                          </p>
                        ) : (
                          canManage && (
                            <div className="mt-4 flex justify-center border-t border-hairline pt-3">
                              <button
                                onClick={() => reverse(e)}
                                disabled={reversing === e.id}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-subink transition-colors hover:bg-warn-soft hover:text-warn disabled:opacity-60"
                              >
                                {reversing === e.id ? (
                                  <Spinner size={13} />
                                ) : (
                                  <RotateCcw size={13} />
                                )}
                                {reversing === e.id ? "Estornando…" : "Estornar procedimento"}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-60"
                >
                  {loadingMore && <Spinner size={15} />}
                  {loadingMore ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
