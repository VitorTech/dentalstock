/** Portas do atendimento. */
import type { ExecutionItemKind, ProcedureExecution } from "@/modules/clinical/domain";
import type { Uuid } from "@/shared/domain";

/**
 * Efetiva a finalização de um procedimento de forma atômica.
 *
 * O caso de uso decide O QUE fazer (via política pura); esta porta garante que
 * baixa de estoque, movimento e histórico aconteçam numa única transação —
 * detalhe de infraestrutura que não pertence à regra de negócio.
 */
export interface ExecutionCommitInput {
  procedureId: Uuid;
  procedureName: string;
  category: string | null;
  deductions: { materialId: Uuid; quantity: number }[];
  historyItems: {
    kind: ExecutionItemKind;
    name: string;
    quantity: number;
    unit: string | null;
    materialId: Uuid | null;
    unitCost: number | null;
  }[];
  totalCost: number | null;
}

export interface ProcedureExecutionRepository {
  /**
   * Efetiva uma ou mais finalizações numa única transação.
   *
   * Recebe uma lista porque o atendimento real costuma ter mais de um
   * procedimento: se o segundo esbarrar em falta de estoque, o primeiro não
   * pode ter sido baixado — ou tudo, ou nada.
   */
  commit(input: {
    tenantId: Uuid;
    sessionId: Uuid | null;
    userId: Uuid | null;
    userName: string | null;
    executions: ExecutionCommitInput[];
  }): Promise<void>;

  findById(tenantId: Uuid, id: Uuid): Promise<ProcedureExecution | null>;

  /**
   * Estorna: devolve as quantidades e marca o registro. Transacional pelo mesmo
   * motivo do commit — devolução parcial deixaria o estoque mentindo.
   */
  reverse(input: {
    tenantId: Uuid;
    executionId: Uuid;
    returns: { materialId: Uuid; quantity: number }[];
    userId: Uuid | null;
    userName: string | null;
  }): Promise<void>;

  listByTenant(input: {
    tenantId: Uuid;
    search?: string;
    sinceDays?: number;
    page: number;
    pageSize: number;
  }): Promise<{ items: ProcedureExecution[]; total: number }>;
}

/**
 * Relatórios de custo das execuções.
 *
 * Lê o custo congelado na finalização: o painel precisa mostrar o que custou
 * naquele dia. Execuções estornadas ficam de fora — elas foram desfeitas.
 */
export interface ExecutionCostReport {
  costByDay(tenantId: Uuid, days: number): Promise<{ date: string; total: number }[]>;
  costBySpecialty(tenantId: Uuid, days: number): Promise<{ name: string; total: number }[]>;
  costByProcedure(
    tenantId: Uuid,
    days: number
  ): Promise<{ name: string; total: number; executions: number }[]>;
}
