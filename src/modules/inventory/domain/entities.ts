/**
 * Inventory: the ledger of stock movements.
 *
 * The balance in `Material.stock` is the result; movements are the explanation.
 */
import type { Uuid } from "@/shared/domain";

/**
 * Nature of a stock movement.
 *
 * `CONSUMPTION` leaves on finalize; `RESTOCK` enters on purchase; `ADJUSTMENT`
 * is the justified manual correction; `REVERSAL` returns what a reversed
 * finalization had consumed.
 */
export type StockMovementType =
  | "CONSUMPTION"
  | "RESTOCK"
  | "ADJUSTMENT"
  | "REVERSAL";

export interface StockMovement {
  id: Uuid;
  materialId: Uuid;
  materialName: string;
  unit: string;
  /** Negative = out, positive = in. */
  quantity: number;
  type: StockMovementType;
  note: string | null;
  unitCost: number | null;
  userName: string | null;
  createdAt: Date;
}

