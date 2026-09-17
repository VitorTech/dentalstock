/** Constantes de tempo compartilhadas pelas políticas de domínio. */

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Data como chega a uma política: `Date` no servidor, texto ISO na interface
 * (JSON não tem tipo de data). Aceitar os dois deixa a mesma regra valer dos
 * dois lados sem conversões espalhadas pelas telas.
 */
export type DateLike = Date | string;

export const toDate = (value: DateLike): Date =>
  value instanceof Date ? value : new Date(value);
