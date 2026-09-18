"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, CalendarClock, CircleDollarSign, PackageX, Stethoscope, TrendingUp, Truck, TriangleAlert } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import BarList, { type BarItem } from "@/modules/analytics/ui/BarList";
import AreaChart from "@/modules/analytics/ui/AreaChart";
import { useDashboard } from "@/modules/analytics/ui/queries";
import { fmtDate, fmtMoney, fmtQty } from "@/shared/ui/format";
import { Kpi, EmptyMini } from "@/modules/analytics/ui/Kpi";

export default function DashboardPage() {
  // Read-only screen: the query cache is the whole state. Coming back from
  // /materiais shows the last figures immediately and revalidates behind them.
  const { data, isLoading: loading } = useDashboard();

  // Ranking by REAL consumption only (finalizations). A clinic that never
  // finalized a procedure shows zeros instead of theoretical demand.
  const usedItems: BarItem[] = (data?.topConsumed ?? []).map((m) => ({
    id: m.id,
    label: m.name,
    value: m.total,
    suffix: m.unit,
  }));

  const specialtyItems: BarItem[] = (data?.topSpecialties ?? []).map((s) => ({
    id: s.id,
    label: s.name,
    value: s.total,
    suffix: "un",
  }));

  return (
    <main className="bg-canvas">
      <SiteHeader maxWidth="max-w-4xl" />

      <section className="mx-auto max-w-4xl px-5 pb-24 pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <BarChart3 size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Painel
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Visão geral do estoque, materiais mais utilizados e reposição.
          </p>
        </div>

        {loading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl2 border border-hairline bg-surface/60" />
            ))}
            <div className="h-64 animate-pulse rounded-xl2 border border-hairline bg-surface/60 sm:col-span-2" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi icon={Boxes} label="Materiais" value={data.totals.materials} />
              <Kpi
                icon={TriangleAlert}
                label="Em baixa"
                value={data.totals.lowStock}
                tone={data.totals.lowStock > 0 ? "danger" : "default"}
                href="/materiais?status=baixa"
              />
              <Kpi
                icon={PackageX}
                label="Sem estoque"
                value={data.totals.outOfStock}
                tone={data.totals.outOfStock > 0 ? "danger" : "default"}
              />
              {data.totals.expiring + data.totals.expired > 0 ? (
                <Kpi
                  icon={CalendarClock}
                  label={data.totals.expired > 0 ? "Vencidos" : "Vencendo"}
                  value={data.totals.expired > 0 ? data.totals.expired : data.totals.expiring}
                  tone={data.totals.expired > 0 ? "danger" : "warn"}
                  href="/materiais?status=validade"
                />
              ) : (
                <Kpi
                  icon={Truck}
                  label="Fornecedores"
                  value={data.totals.suppliers}
                  href="/fornecedores"
                />
              )}
            </div>

            {/* Cost — omitted by the API for whoever cannot see amounts */}
            {data.cost && (
              <div className="rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
                <div className="mb-1 flex items-center gap-2">
                  <CircleDollarSign size={16} className="text-subink" />
                  <h2 className="text-[16px] font-semibold text-ink">
                    Custo de material (últimos 30 dias)
                  </h2>
                </div>
                <p className="mb-4 text-[12.5px] text-subink">
                  Total gasto:{" "}
                  <span className="font-semibold text-ink">{fmtMoney(data.cost.total30d)}</span>
                  {data.cost.materialsWithoutCost > 0 && (
                    <>
                      {" "}
                      · {data.cost.materialsWithoutCost}{" "}
                      {data.cost.materialsWithoutCost === 1
                        ? "material ainda sem preço"
                        : "materiais ainda sem preço"}
                      , então o total é parcial
                    </>
                  )}
                </p>

                {data.cost.total30d > 0 ? (
                  <>
                    <AreaChart data={data.cost.byDay} />

                    {data.cost.byProcedure.length > 0 && (
                      <div className="mt-6">
                        <h3 className="mb-1 text-[13.5px] font-semibold text-ink">
                          Custo por procedimento
                        </h3>
                        <p className="mb-3 text-[12px] text-subink">
                          Quanto custa, em média, cada procedimento realizado.
                        </p>
                        <ul className="flex flex-col divide-y divide-hairline/60">
                          {data.cost.byProcedure.map((p) => (
                            <li
                              key={p.name}
                              className="flex items-center justify-between gap-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[13.5px] font-medium text-ink">
                                  {p.name}
                                </p>
                                <p className="text-[12px] text-subink">
                                  {p.executions}{" "}
                                  {p.executions === 1 ? "realizado" : "realizados"} ·{" "}
                                  {fmtMoney(p.total)} no total
                                </p>
                              </div>
                              <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">
                                {fmtMoney(p.average)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyMini text="Nenhum custo apurado. Informe o custo unitário dos materiais para acompanhar quanto cada procedimento consome." />
                )}
              </div>
            )}

            {/* Expiry */}
            {data.expiring.length > 0 && (
              <div className="rounded-xl2 border border-warn/30 bg-surface p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-warn" />
                    <h2 className="text-[16px] font-semibold text-ink">Validade</h2>
                  </div>
                  <Link
                    href="/materiais?status=validade"
                    className="flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline"
                  >
                    Ver em Materiais <ArrowRight size={13} />
                  </Link>
                </div>

                <ul className="flex flex-col divide-y divide-hairline/60">
                  {data.expiring.slice(0, 10).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-ink">{m.name}</p>
                        <p className="text-[12px] text-subink">
                          {fmtQty(m.stock)} {m.unit} em estoque · vence {fmtDate(m.expiresAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          m.expired ? "bg-danger text-white" : "bg-warn-soft text-warn"
                        }`}
                      >
                        {m.expired
                          ? `Vencido há ${Math.abs(m.daysLeft)}d`
                          : `${m.daysLeft}d restantes`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Most used + consumption */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
                <div className="mb-1 flex items-center gap-2">
                  <TrendingUp size={16} className="text-subink" />
                  <h2 className="text-[16px] font-semibold text-ink">Materiais mais utilizados</h2>
                </div>
                <p className="mb-4 text-[12.5px] text-subink">
                  Consumo real registrado nas finalizações de procedimentos.
                </p>
                {usedItems.length > 0 ? (
                  <BarList items={usedItems} />
                ) : (
                  <EmptyMini text="Nenhum material consumido ainda. O ranking aparece conforme os procedimentos forem finalizados." />
                )}
              </div>

              <div className="rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
                <div className="mb-1 flex items-center gap-2">
                  <BarChart3 size={16} className="text-subink" />
                  <h2 className="text-[16px] font-semibold text-ink">Consumo (últimos 30 dias)</h2>
                </div>
                <p className="mb-4 text-[12.5px] text-subink">
                  Total consumido:{" "}
                  <span className="font-semibold text-ink">
                    {Number.isInteger(data.totalConsumed30d)
                      ? data.totalConsumed30d
                      : data.totalConsumed30d.toFixed(1)}
                  </span>{" "}
                  unidades
                </p>
                {data.totalConsumed30d > 0 ? (
                  <AreaChart data={data.consumptionByDay} />
                ) : (
                  <EmptyMini text="Nenhum consumo nos últimos 30 dias. Finalize procedimentos para começar a ver a evolução." />
                )}
              </div>
            </div>

            {/* Consumption by specialty */}
            <div className="rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
              <div className="mb-1 flex items-center gap-2">
                <Stethoscope size={16} className="text-subink" />
                <h2 className="text-[16px] font-semibold text-ink">Consumo por especialidade</h2>
              </div>
              <p className="mb-4 text-[12.5px] text-subink">
                Quais áreas mais consomem materiais, somando os procedimentos finalizados.
              </p>
              {specialtyItems.length > 0 ? (
                <BarList items={specialtyItems} />
              ) : (
                <EmptyMini text="Nenhum consumo registrado ainda. Finalize procedimentos para ver a distribuição por especialidade." />
              )}
            </div>

            {/* Critical stock */}
            <div className="rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TriangleAlert size={16} className="text-subink" />
                  <h2 className="text-[16px] font-semibold text-ink">Estoque crítico</h2>
                </div>
                {data.lowStock.length > 0 && (
                  <Link
                    href="/materiais?status=baixa"
                    className="flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline"
                  >
                    Ver em Materiais <ArrowRight size={13} />
                  </Link>
                )}
              </div>

              {data.lowStock.length === 0 ? (
                <EmptyMini text="Nenhum material em baixa. Tudo em dia! 🎉" />
              ) : (
                <ul className="flex flex-col divide-y divide-hairline/60">
                  {data.lowStock.slice(0, 10).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-ink">{m.name}</p>
                        <p className="text-[12px] text-subink">
                          {m.supplier
                            ? `Contate ${m.supplier} para repor`
                            : "Sem fornecedor definido"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          m.zero ? "bg-danger text-white" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {m.zero ? "Sem estoque" : `${m.stock}/${m.minStock} ${m.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
