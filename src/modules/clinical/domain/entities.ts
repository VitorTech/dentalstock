/**
 * Clinical work: executed procedures and their items.
 *
 * Item names and costs are stored as a snapshot on purpose: if a material is
 * renamed or repriced later, history stays faithful to what was used.
 */
import type { Uuid } from "@/shared/domain";

export type ExecutionItemKind = "MATERIAL" | "INSTRUMENT";

export interface ExecutionItem {
  id: Uuid;
  kind: ExecutionItemKind;
  name: string;
  quantity: number;
  unit: string | null;
  /** Source material, while it still exists — the target of a reversal. */
  materialId: Uuid | null;
  /** Unit cost in effect on the execution date (snapshot). */
  unitCost: number | null;
}

export interface ProcedureExecution {
  id: Uuid;
  procedureId: Uuid | null;
  procedureName: string;
  category: string | null;
  createdAt: Date;
  items: ExecutionItem[];
  /** Who finalized it. Null for history older than authorship tracking. */
  userName: string | null;
  /** Groups the procedures finalized in the same appointment. */
  sessionId: Uuid | null;
  /** When it was reversed; null while it still stands. */
  reversedAt: Date | null;
  reversedByName: string | null;
  /** Total cost at the moment of finalization. */
  totalCost: number | null;
}
