/** Formatação compartilhada pelas telas — uma só definição para todas. */

import { toDate, type DateLike } from "@/shared/domain";

/** Quantidade: inteiro sem casas, fracionado com uma. */
export const fmtQty = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** Valor em reais. `null` vira travessão: ausência de preço não é "R$ 0,00". */
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

/** Data no formato aceito por `<input type="date">`. */
export const toDateInput = (value: DateLike | null): string =>
  value ? toDate(value).toISOString().slice(0, 10) : "";

/** Data por extenso ("16 de setembro de 2026"); ausência vira travessão. */
export const fmtLongDate = (value: DateLike | null): string =>
  value
    ? toDate(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
