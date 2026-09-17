/**
 * Atendimento: procedimentos executados e seus itens.
 *
 * Nomes e custos dos itens são guardados como cópia (snapshot) de propósito:
 * se um material for renomeado ou reprecificado depois, o histórico continua
 * fiel ao que foi usado.
 */
import type { Uuid } from "@/shared/domain";

export type ExecutionItemKind = "MATERIAL" | "INSTRUMENT";

export interface ExecutionItem {
  id: Uuid;
  kind: ExecutionItemKind;
  name: string;
  quantity: number;
  unit: string | null;
  /** Material de origem, quando ainda existe — é o alvo da devolução no estorno. */
  materialId: Uuid | null;
  /** Custo unitário praticado na data da execução (snapshot). */
  unitCost: number | null;
}

export interface ProcedureExecution {
  id: Uuid;
  procedureId: Uuid | null;
  procedureName: string;
  category: string | null;
  createdAt: Date;
  items: ExecutionItem[];
  /** Quem finalizou. Nulo no histórico anterior ao registro de autoria. */
  userName: string | null;
  /** Agrupador dos procedimentos finalizados no mesmo atendimento. */
  sessionId: Uuid | null;
  /** Quando foi estornado; nulo enquanto vale. */
  reversedAt: Date | null;
  reversedByName: string | null;
  /** Custo total no momento da finalização. */
  totalCost: number | null;
}
