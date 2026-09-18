/** Clinical ports. */
import type { ExecutionItemKind, ProcedureExecution } from "@/modules/clinical/domain";
import type { Uuid } from "@/shared/domain";

/**
 * Commits a procedure finalization atomically.
 *
 * The use case decides WHAT to do (through a pure policy); this port
 * guarantees that stock deduction, movement and history happen in a single
 * transaction — an infrastructure detail that does not belong to the rule.
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
   * Commits one or more finalizations in a single transaction.
   *
   * It takes a list because a real appointment usually has more than one
   * procedure: if the second one hits insufficient stock, the first must not
   * have been deducted — all or nothing.
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
   * Reversal: returns the quantities and marks the record. Transactional for
   * the same reason as commit — a partial return would leave stock lying.
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
 * Execution cost reports.
 *
 * Reads the cost frozen at finalize time: the dashboard must show what it cost
 * that day. Reversed executions are excluded — they were undone.
 */
export interface ExecutionCostReport {
  costByDay(tenantId: Uuid, days: number): Promise<{ date: string; total: number }[]>;
  costBySpecialty(tenantId: Uuid, days: number): Promise<{ name: string; total: number }[]>;
  costByProcedure(
    tenantId: Uuid,
    days: number
  ): Promise<{ name: string; total: number; executions: number }[]>;
}
