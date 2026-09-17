/** Aritmética monetária compartilhada. */

/** Arredondamento para centavos, aplicado a todo resultado monetário. */
export function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}
