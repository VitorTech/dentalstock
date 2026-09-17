/**
 * Finalização e estorno de procedimentos.
 *
 * A finalização é o coração do produto, e aqui fica visível que ela não tem
 * nada de banco: o caso de uso busca dados pelas portas, pede a decisão à
 * política pura e manda persistir o resultado.
 */
import type { MaterialRepository, ProcedureRepository } from "@/modules/catalog/application";
import { type ShortageDetail, planConsumption, planReversal } from "@/modules/clinical/domain";
import type { SecretGenerator } from "@/shared/application";
import { type AuthenticatedActor, NotFoundError, Quantity, type Uuid, ValidationError } from "@/shared/domain";
import type { ExecutionCommitInput, ProcedureExecutionRepository } from "../ports";

export type FinalizeOutcome =
  | { ok: true; cost: number | null; procedures: number }
  | { ok: false; shortages: ShortageDetail[] };

/** Teto de procedimentos numa mesma sessão — um atendimento real não passa disso. */
const MAX_PROCEDURES_PER_SESSION = 20;

interface RequestedProcedure {
  procedureId: string;
  lines: { materialId: string; quantity: number }[];
}

/**
 * Finaliza um ou mais procedimentos: baixa os materiais e registra o histórico.
 *
 * Regra do produto aplicada pela política: material é consumido, instrumental
 * não — este entra no histórico como checklist, sem alterar estoque.
 *
 * Aceita vários procedimentos porque o atendimento real raramente tem um só. Os
 * registros ficam separados (o custo e o consumo são de cada procedimento) mas
 * compartilham um `sessionId`, e a baixa é uma transação única: se o segundo
 * procedimento esbarrar em falta, o primeiro não pode ter saído do estoque.
 *
 * A conferência de estoque considera a demanda SOMADA da sessão — dois
 * procedimentos que usam o mesmo material precisam caber juntos, não cada um
 * por si.
 */
export class FinalizeProcedureUseCase {
  constructor(
    private readonly procedures: ProcedureRepository,
    private readonly materials: MaterialRepository,
    private readonly executions: ProcedureExecutionRepository,
    private readonly secrets: SecretGenerator
  ) {}

  async execute(
    actor: AuthenticatedActor,
    input: { procedureId?: unknown; materials?: unknown; procedures?: unknown }
  ): Promise<FinalizeOutcome> {
    const requested = this.readRequest(input);
    const tenantId = actor.tenantId;

    const allMaterialIds = Array.from(
      new Set(requested.flatMap((r) => r.lines.map((l) => l.materialId)))
    );
    const available = await this.materials.findManyByIds(tenantId, allMaterialIds);

    // Saldo corrente da sessão: cada procedimento planejado desconta do que
    // sobrou para o próximo.
    const remaining = new Map(available.map((m) => [m.id, m.stock]));

    const commits: ExecutionCommitInput[] = [];
    const shortages: ShortageDetail[] = [];

    for (const item of requested) {
      const procedure = await this.procedures.findById(tenantId, item.procedureId);
      if (!procedure) throw new NotFoundError("Procedimento não encontrado.");

      const snapshot = available.map((m) => ({ ...m, stock: remaining.get(m.id) ?? m.stock }));
      const planned = planConsumption(procedure, item.lines, snapshot);

      if (planned.shortages.length > 0) {
        shortages.push(...planned.shortages);
        continue;
      }

      for (const d of planned.plan.deductions) {
        remaining.set(d.materialId, (remaining.get(d.materialId) ?? 0) - d.quantity);
      }

      commits.push({
        procedureId: procedure.id,
        procedureName: procedure.name,
        category: procedure.category,
        deductions: planned.plan.deductions.map((d) => ({
          materialId: d.materialId,
          quantity: d.quantity,
        })),
        historyItems: planned.plan.historyItems,
        // Total parcial não é reportado como se fosse completo: sem nenhum item
        // precificado o custo fica nulo, e a tela diz que falta cadastrar preço.
        totalCost:
          planned.plan.cost.counted > planned.plan.cost.missing ? planned.plan.cost.total : null,
      });
    }

    if (shortages.length > 0) return { ok: false, shortages };

    await this.executions.commit({
      tenantId,
      // Só marca sessão quando de fato houve mais de um procedimento: um
      // agrupador de um item só não informa nada.
      sessionId: commits.length > 1 ? this.secrets.token(12) : null,
      userId: actor.userId,
      userName: actor.name,
      executions: commits,
    });

    const costs = commits.map((c) => c.totalCost).filter((c): c is number => c !== null);
    return {
      ok: true,
      cost: costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) * 100) / 100 : null,
      procedures: commits.length,
    };
  }

  /**
   * Normaliza o corpo da requisição.
   *
   * Aceita tanto `{ procedureId, materials }` (um procedimento) quanto
   * `{ procedures: [...] }` (sessão). O formato antigo continua valendo porque
   * uma tela em cache no navegador do cliente não pode quebrar a operação mais
   * usada do sistema.
   */
  private readRequest(input: {
    procedureId?: unknown;
    materials?: unknown;
    procedures?: unknown;
  }): RequestedProcedure[] {
    const raw = Array.isArray(input.procedures)
      ? input.procedures
      : [{ procedureId: input.procedureId, materials: input.materials }];

    if (raw.length === 0) {
      throw new ValidationError("Informe ao menos um procedimento.", "procedures");
    }
    if (raw.length > MAX_PROCEDURES_PER_SESSION) {
      throw new ValidationError("Procedimentos demais numa mesma finalização.", "procedures");
    }

    const seen = new Set<string>();

    return raw.map((entry) => {
      const item = entry as { procedureId?: unknown; materials?: unknown };
      const procedureId = String(item.procedureId ?? "");
      if (!procedureId) throw new ValidationError("procedureId é obrigatório.", "procedureId");
      if (seen.has(procedureId)) {
        throw new ValidationError(
          "O mesmo procedimento foi enviado duas vezes.",
          "procedures"
        );
      }
      seen.add(procedureId);

      if (!Array.isArray(item.materials) || item.materials.length === 0) {
        throw new ValidationError("Informe ao menos um material.", "materials");
      }
      // Teto de itens: barra payload absurdo numa rota que escreve no banco.
      if (item.materials.length > 200) {
        throw new ValidationError("Lista de materiais muito longa.", "materials");
      }

      const lines = item.materials.map((rawLine) => {
        const line = rawLine as { materialId?: unknown; quantity?: unknown };
        const materialId = String(line.materialId ?? "");
        if (!materialId) throw new ValidationError("materialId é obrigatório.", "materials");
        return { materialId, quantity: Quantity.create(line.quantity).value };
      });

      return { procedureId, lines };
    });
  }
}

/**
 * Estorna uma finalização.
 *
 * O registro NÃO é apagado: some do saldo e do painel, mas permanece no
 * histórico marcado como estornado. Auditoria não pode perder o que aconteceu —
 * só registrar que foi desfeito, por quem e quando.
 */
export class ReverseExecutionUseCase {
  constructor(private readonly executions: ProcedureExecutionRepository) {}

  async execute(actor: AuthenticatedActor, executionId: Uuid): Promise<void> {
    const execution = await this.executions.findById(actor.tenantId, executionId);
    if (!execution) throw new NotFoundError("Registro não encontrado.");

    // A política decide o que devolver (e recusa estorno duplicado).
    const { returns } = planReversal(execution);

    await this.executions.reverse({
      tenantId: actor.tenantId,
      executionId,
      returns,
      userId: actor.userId,
      userName: actor.name,
    });
  }
}
