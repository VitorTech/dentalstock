/** Formatting shared by the screens — one definition for all of them. */

import { toDate, type DateLike } from "@/shared/domain";

/** Quantity: integers without decimals, fractions with one. */
export const fmtQty = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** Amount in reais. `null` becomes a dash: no price is not "R$ 0,00". */
export const fmtMoney = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? "—"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (value: DateLike): string =>
  toDate(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const fmtDateTime = (value: DateLike): string =>
  toDate(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Date in the format accepted by `<input type="date">`. */
export const toDateInput = (value: DateLike | null): string =>
  value ? toDate(value).toISOString().slice(0, 10) : "";

/** Long-form date ("16 de setembro de 2026"); absence becomes a dash. */
export const fmtLongDate = (value: DateLike | null): string =>
  value
    ? toDate(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
