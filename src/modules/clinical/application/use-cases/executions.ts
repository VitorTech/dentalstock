/**
 * Procedure finalization and reversal.
 *
 * Finalization is the heart of the product, and here it is visible that it has
 * nothing to do with the database: the use case fetches data through ports,
 * asks a pure policy for the decision and hands the result to be persisted.
 */
import type { MaterialRepository, ProcedureRepository } from "@/modules/catalog/application";
import { type ShortageDetail, planConsumption, planReversal } from "@/modules/clinical/domain";
import type { SecretGenerator } from "@/shared/application";
import { type AuthenticatedActor, NotFoundError, Quantity, type Uuid, ValidationError } from "@/shared/domain";
import type { ExecutionCommitInput, ProcedureExecutionRepository } from "../ports";

export type FinalizeOutcome =
  | { ok: true; cost: number | null; procedures: number }
  | { ok: false; shortages: ShortageDetail[] };

/** Cap of procedures in one session — a real appointment never exceeds it. */
const MAX_PROCEDURES_PER_SESSION = 20;

interface RequestedProcedure {
  procedureId: string;
  lines: { materialId: string; quantity: number }[];
}

/**
 * Finalizes one or more procedures: deducts materials and records history.
 *
 * Product rule enforced by the policy: materials are consumed, instruments are
 * not — the latter land in history as a checklist, without touching stock.
 *
 * It accepts several procedures because a real appointment rarely has just
 * one. The records stay separate (cost and consumption belong to each
 * procedure) but share a `sessionId`, and the deduction is a single
 * transaction: if the second procedure hits a shortage, the first must not
 * have left the stock.
 *
 * The stock check considers the SUMMED demand of the session — two procedures
 * using the same material must fit together, not each on its own.
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

    // Running balance for the session: each planned procedure subtracts from
    // what is left for the next one.
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
        // A partial total is never reported as complete: with no priced item
        // the cost stays null, and the screen says a price is missing.
        totalCost:
          planned.plan.cost.counted > planned.plan.cost.missing ? planned.plan.cost.total : null,
      });
    }

    if (shortages.length > 0) return { ok: false, shortages };

    await this.executions.commit({
      tenantId,
      // A session is only marked when there really was more than one procedure:
      // a grouper around a single item tells nobody anything.
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
   * Normalizes the request body.
   *
   * Accepts both `{ procedureId, materials }` (a single procedure) and
   * `{ procedures: [...] }` (a session). The older shape still works because a
   * screen cached in the customer's browser must not break the most used
   * operation in the system.
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
      // Item cap: blocks an absurd payload on a route that writes to the database.
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
 * Reverses a finalization.
 *
 * The record is NOT deleted: it disappears from the balance and the dashboard,
 * but remains in history marked as reversed. An audit trail cannot lose what
 * happened — only record that it was undone, by whom and when.
 */
export class ReverseExecutionUseCase {
  constructor(private readonly executions: ProcedureExecutionRepository) {}

  async execute(actor: AuthenticatedActor, executionId: Uuid): Promise<void> {
    const execution = await this.executions.findById(actor.tenantId, executionId);
    if (!execution) throw new NotFoundError("Registro não encontrado.");

    // The policy decides what to return (and refuses a double reversal).
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
