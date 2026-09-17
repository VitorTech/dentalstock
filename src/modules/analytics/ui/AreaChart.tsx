"use client";

import { useId } from "react";

/** Gráfico de área simples em SVG, responsivo e sem dependências.
 * Usa a cor de destaque do tema (var(--accent)). */
export default function AreaChart({
  data,
  height = 120,
}: {
  data: { date: string; total: number }[];
  height?: number;
}) {
  const gradId = useId();
  const W = 600;
  const H = 160;
  const pad = 6;

  const max = Math.max(1, ...data.map((d) => d.total));
  const n = data.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * (W - pad * 2) + pad);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.total).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;

  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
        role="img"
        aria-label="Consumo diário nos últimos 30 dias"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-subink">
        <span>{data.length ? fmt(data[0].date) : ""}</span>
        <span>{data.length ? fmt(data[data.length - 1].date) : ""}</span>
      </div>
    </div>
  );
}
