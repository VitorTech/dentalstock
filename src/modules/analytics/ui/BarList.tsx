"use client";

export type BarItem = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
};

/** Ranking em barras horizontais (estilo "bar list"), leve e sem dependências.
 * A barra usa a cor de destaque atual do tema. */
export default function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, idx) => (
        <li key={item.id} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-right text-[12px] tabular-nums text-subink">
            {idx + 1}
          </span>
          <div className="relative min-w-0 flex-1">
            <div
              className="h-7 rounded-md bg-accent-soft transition-[width] duration-500 ease-apple"
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
            <span className="absolute inset-y-0 left-2.5 flex items-center truncate pr-2 text-[13px] font-medium text-ink">
              {item.label}
            </span>
          </div>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
            {Number.isInteger(item.value) ? item.value : item.value.toFixed(1)}
            {item.suffix && <span className="ml-1 font-normal text-subink">{item.suffix}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
