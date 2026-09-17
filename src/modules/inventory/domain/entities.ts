/**
 * Estoque: o livro-razão de movimentos e as sessões de balanço.
 *
 * O saldo em `Material.stock` é o resultado; os movimentos são a explicação.
 */
import type { Uuid } from "@/shared/domain";

/**
 * Natureza de um movimento de estoque.
 *
 * `CONSUMPTION` sai pela finalização; `RESTOCK` entra por compra; `ADJUSTMENT`
 * é a correção manual justificada; `REVERSAL` devolve o que uma finalização
 * estornada havia consumido.
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
  /** Negativo = saída, positivo = entrada. */
  quantity: number;
  type: StockMovementType;
  note: string | null;
  unitCost: number | null;
  userName: string | null;
  createdAt: Date;
}

