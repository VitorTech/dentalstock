"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";

/** Blocos de indicador do painel. */
export function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
  href,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  tone?: "default" | "danger" | "warn";
  href?: string;
}) {
  const border =
    tone === "danger" ? "border-danger/30" : tone === "warn" ? "border-warn/40" : "border-hairline";
  const accent =
    tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-subink";
  const number = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-ink";

  const body = (
    <div
      className={`flex h-full flex-col justify-between rounded-xl2 border bg-surface p-5 shadow-card transition-shadow ${
        href ? "hover:shadow-cardHover" : ""
      } ${border}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-subink">{label}</span>
        <Icon size={16} className={accent} />
      </div>
      <span className={`mt-2 text-[30px] font-semibold tabular-nums ${number}`}>{value}</span>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-canvas px-4 py-8 text-center text-[13px] text-subink">
      {text}
    </div>
  );
}
