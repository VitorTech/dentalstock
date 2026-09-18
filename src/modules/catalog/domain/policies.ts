/**
 * Stock level policies for a catalog item.
 *
 * They live in the catalog because `stock` and `minStock` are attributes of
 * the item itself: this way any later module — and the catalog UI — uses the
 * same rule, instead of rewriting `stock <= minStock` on each screen.
 */
import type { Instrument, Material } from "./entities";

/**
 * Only materials have a minimum: they are the ones consumed and restocked.
 * Instruments are reusable, so they are out of this rule — and the signature
 * keeps them from sneaking back in by accident.
 */
export function isLowStock(item: Pick<Material, "stock" | "minStock">): boolean {
  return item.stock <= item.minStock;
}

export function isOutOfStock(item: Pick<Material | Instrument, "stock">): boolean {
  return item.stock <= 0;
}
