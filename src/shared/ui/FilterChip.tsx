"use client";

import type { ReactNode } from "react";

/** Filtro liga/desliga em forma de pílula, com tom de alerta quando ativo. */
export default function FilterChip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "danger" | "warn";
  onClick: () => void;
  children: ReactNode;
}) {
  const activeClasses =
    tone === "danger"
      ? "border-danger bg-danger-soft text-danger"
      : "border-warn bg-warn-soft text-warn";

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? activeClasses : "border-hairline text-subink hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
