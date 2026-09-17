/** Histórico de atendimentos e sua exportação. */
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

/** Teto de linhas da exportação: protege memória do servidor e do Excel. */
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
 * Histórico em formato de planilha — uma linha por ITEM, não por procedimento.
 *
 * É a forma que o contador e o próprio dono conseguem usar: dá para somar por
 * material, por especialidade ou por mês numa tabela dinâmica. Uma linha por
 * procedimento, com os itens amontoados numa célula, não permite nenhuma dessas
 * contas.
 *
 * Estornados entram marcados em vez de sumirem: quem confere quer ver que o
 * lançamento existiu e foi desfeito.
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
