"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import Spinner from "@/shared/ui/Spinner";
import { listMovements, type StockMovementView } from "@/modules/inventory/ui/api";
import { useMe } from "@/modules/identity/ui/use-me";
import { fmtDateTime, fmtMoney, fmtQty } from "@/shared/ui/format";
import type { StockMovementType } from "@/modules/inventory/domain";

/** Rótulo, ícone e cor de cada natureza de movimento. */
const KINDS: Record<
  StockMovementType,
  { label: string; icon: typeof ArrowUpRight; tone: string }
> = {
  RESTOCK: { label: "Entrada", icon: ArrowUpRight, tone: "text-success bg-success-soft" },
  CONSUMPTION: { label: "Consumo", icon: ArrowDownLeft, tone: "text-accent bg-accent-soft" },
  ADJUSTMENT: { label: "Ajuste", icon: SlidersHorizontal, tone: "text-warn bg-warn-soft" },
  REVERSAL: { label: "Estorno", icon: RotateCcw, tone: "text-warn bg-warn-soft" },
};

const FILTERS: { label: string; value: StockMovementType | "" }[] = [
  { label: "Tudo", value: "" },
  { label: "Entradas", value: "RESTOCK" },
  { label: "Consumo", value: "CONSUMPTION" },
  { label: "Ajustes", value: "ADJUSTMENT" },
  { label: "Estornos", value: "REVERSAL" },
];

const PERIODS = [
  { label: "Tudo", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

export default function MovimentacoesPage() {
  const { canSeeCosts } = useMe();
  const [movements, setMovements] = useState<StockMovementView[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<StockMovementType | "">("");
  const [days, setDays] = useState(0);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Chegando de /materiais, o extrato já vem restrito a um material.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMaterialId(params.get("materialId"));
  }, []);

  const load = useCallback(
    async (p: number, t: string, d: number, mat: string | null, append: boolean) => {
      const page = await listMovements({
        page: p,
        days: d,
        type: t as StockMovementType | "",
        materialId: mat,
      });

      setMovements((prev) => (append ? [...prev, ...page.movements] : page.movements));
      setTotal(page.total);
      setHasMore(page.hasMore);
    },
    []
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setPage(1);
      await load(1, type, days, materialId, false);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [type, days, materialId, load]);

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    await load(next, type, days, materialId, true);
    setPage(next);
    setLoadingMore(false);
  };

  const materialName = materialId ? movements[0]?.materialName : null;

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <ScrollText size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Extrato do estoque
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Toda entrada, consumo e correção — com autor, data e motivo.
          </p>
        </div>

        {materialId && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl2 border border-hairline bg-surface px-4 py-2.5">
            <p className="text-[13px] text-subink">
              Mostrando apenas <span className="font-medium text-ink">{materialName ?? "um material"}</span>
            </p>
            <button
              onClick={() => setMaterialId(null)}
              className="text-[12.5px] font-medium text-accent transition-colors hover:underline"
            >
              Ver todos
            </button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setType(f.value)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                type === f.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-hairline text-subink hover:bg-surface hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                  days === p.days ? "bg-ink text-surface" : "text-subink hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-[12.5px] text-subink">
              {total} {total === 1 ? "movimento" : "movimentos"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-[62px] animate-pulse rounded-xl2 border border-hairline bg-surface/60"
              />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
            <ScrollText size={28} className="text-subink" />
            <p className="text-[14.5px] font-medium text-ink">Nenhum movimento no período</p>
            <p className="max-w-sm text-[13px] text-subink">
              Entradas, consumos e ajustes aparecem aqui assim que acontecem.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-hairline/60 rounded-xl2 border border-hairline bg-surface shadow-card">
              {movements.map((m) => {
                const kind = KINDS[m.type];
                const Icon = kind.icon;
                const incoming = m.quantity > 0;
                return (
                  <div key={m.id} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${kind.tone}`}
                    >
                      <Icon size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink">{m.materialName}</p>
                      <p className="mt-0.5 text-[12px] text-subink">
                        {kind.label} · {fmtDateTime(m.createdAt)}
                        {m.userName && ` · ${m.userName}`}
                      </p>
                      {m.note && (
                        <p className="mt-1 break-words text-[12.5px] italic text-subink">{m.note}</p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`text-[14px] font-semibold tabular-nums ${
                          incoming ? "text-success" : "text-ink"
                        }`}
                      >
                        {incoming ? "+" : ""}
                        {fmtQty(m.quantity)} {m.unit}
                      </p>
                      {canSeeCosts && m.unitCost !== null && (
                        <p className="text-[11.5px] tabular-nums text-subink">
                          {fmtMoney(m.unitCost)}/{m.unit}
                        </p>
                      )}
                    </div>
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
