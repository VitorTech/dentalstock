/** Shared monetary arithmetic. */

/** Rounds to cents; applied to every monetary result. */
export function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}
