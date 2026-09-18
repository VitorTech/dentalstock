/** Reading of the request parameters specific to inventory. */
import type { StockMovementType } from "@/modules/inventory/domain";

const MOVEMENT_TYPES: readonly StockMovementType[] = [
  "CONSUMPTION",
  "RESTOCK",
  "ADJUSTMENT",
  "REVERSAL",
];

/** Filter allowlist: a value outside the list is ignored, never queried. */
export function readMovementType(value: string | null): StockMovementType | undefined {
  return MOVEMENT_TYPES.includes(value as StockMovementType)
    ? (value as StockMovementType)
    : undefined;
}
