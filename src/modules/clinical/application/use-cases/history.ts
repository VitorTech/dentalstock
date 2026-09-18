/** Appointment history and its export. */
import type { ProcedureExecution } from "@/modules/clinical/domain";
import type { Uuid } from "@/shared/domain";
import type { ProcedureExecutionRepository } from "../ports";

export class ListHistoryUseCase {
  constructor(private readonly executions: ProcedureExecutionRepository) {}

  execute(input: {
    tenantId: Uuid;
    search?: string;
    sinceDays?: number;
    page: number;
    pageSize: number;
  }): Promise<{ items: ProcedureExecution[]; total: number }> {
    return this.executions.listByTenant(input);
  }
}

/** Export row cap: protects both the server's memory and Excel. */
const EXPORT_MAX_ROWS = 5000;

export interface ExportRow {
  date: Date;
  procedure: string;
  category: string | null;
  user: string | null;
  itemKind: string;
  item: string;
  quantity: number;
  unit: string | null;
  unitCost: number | null;
  lineCost: number | null;
  reversed: boolean;
}

/**
 * History as a spreadsheet — one row per ITEM, not per procedure.
 *
 * That is the shape an accountant (and the owner) can actually use: it allows
 * summing by material, by specialty or by month in a pivot table. One row per
 * procedure, with items crammed into a cell, allows none of those.
 *
 * Reversed entries appear flagged instead of disappearing: whoever is checking
 * wants to see that the entry existed and was undone.
 */
export class ExportHistoryUseCase {
  constructor(private readonly executions: ProcedureExecutionRepository) {}

  async execute(input: {
    tenantId: Uuid;
    search?: string;
    sinceDays?: number;
  }): Promise<ExportRow[]> {
    const { items } = await this.executions.listByTenant({
      ...input,
      page: 1,
      pageSize: EXPORT_MAX_ROWS,
    });

    return items.flatMap((execution) =>
      execution.items.map((item) => ({
        date: execution.createdAt,
        procedure: execution.procedureName,
        category: execution.category,
        user: execution.userName,
        itemKind: item.kind === "MATERIAL" ? "Material" : "Instrumental",
        item: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        lineCost:
          item.unitCost === null
            ? null
            : Math.round(item.quantity * item.unitCost * 100) / 100,
        reversed: execution.reversedAt !== null,
      }))
    );
  }
}
