/** Leitura dos parâmetros de requisição específicos do estoque. */
import type { StockMovementType } from "@/modules/inventory/domain";

const MOVEMENT_TYPES: readonly StockMovementType[] = [
  "CONSUMPTION",
  "RESTOCK",
  "ADJUSTMENT",
  "REVERSAL",
];

/** Allowlist do filtro: valor fora da lista é ignorado, não vira consulta. */
export function readMovementType(value: string | null): StockMovementType | undefined {
  return MOVEMENT_TYPES.includes(value as StockMovementType)
    ? (value as StockMovementType)
    : undefined;
}
