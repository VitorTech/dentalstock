/**
 * Casos de uso de movimentação: entrada, ajuste e extrato.
 *
 * Regra que atravessa o arquivo: nenhuma alteração de saldo acontece sem
 * movimento correspondente.
 */
import type { MaterialRepository } from "@/modules/catalog/application";
import type { Material } from "@/modules/catalog/domain";
import { canSeeCosts } from "@/modules/identity/domain";
import { type StockMovement, type StockMovementType, weightedAverageCost } from "@/modules/inventory/domain";
import { type AuthenticatedActor, Money, NonEmptyText, NotFoundError, Quantity, StockLevel, type Uuid, ValidationError, toCents } from "@/shared/domain";
import type { StockMovementRepository } from "../ports";

/**
 * Entrada de material (compra/reposição).
 *
 * Quando a nota traz um preço, o custo do material é recalculado por média
 * ponderada em vez de simplesmente substituído — a decisão e o porquê estão em
 * `weightedAverageCost`.
 */
export class RegisterStockEntryUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly movements: StockMovementRepository
  ) {}

  async execute(
    actor: AuthenticatedActor,
    input: { materialId: unknown; quantity: unknown; unitCost?: unknown; note?: unknown }
  ): Promise<Material> {
    const materialId = String(input.materialId ?? "");
    const quantity = Quantity.create(input.quantity);
    // Informar preço é privilégio de quem enxerga custo. O valor enviado por
    // outro papel é IGNORADO, não recusado: dar entrada no que chegou é trabalho
    // legítimo do auxiliar, e não deve falhar por causa de um campo a mais.
    // Antes esta regra vivia na rota HTTP; aqui ela vale para qualquer entrada.
    const unitCost = canSeeCosts(actor.role) ? Money.optional(input.unitCost) : null;
    const note = NonEmptyText.optional(input.note, "observação", 300);

    const material = await this.materials.findById(actor.tenantId, materialId);
    if (!material) throw new NotFoundError("Material não encontrado.");

    const newMaterialCost =
      unitCost === null
        ? undefined
        : weightedAverageCost({
            currentStock: material.stock,
            currentCost: material.unitCost,
            incomingQuantity: quantity.value,
            incomingCost: unitCost,
          });

    return this.movements.register({
      tenantId: actor.tenantId,
      materialId: material.id,
      quantity: quantity.value,
      type: "RESTOCK",
      note,
      unitCost,
      newMaterialCost,
      userId: actor.userId,
      userName: actor.name,
    });
  }
}

/**
 * Ajuste manual do saldo.
 *
 * A tela informa o saldo que deveria estar lá (é assim que a pessoa pensa: "na
 * verdade tem 12"), e aqui se converte para a diferença. O motivo é
 * obrigatório: ajuste sem justificativa é justamente o registro que não explica
 * nada quando o estoque não fecha.
 */
export class AdjustStockUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly movements: StockMovementRepository
  ) {}

  async execute(
    actor: AuthenticatedActor,
    input: { materialId: unknown; stock: unknown; reason: unknown }
  ): Promise<Material> {
    const materialId = String(input.materialId ?? "");
    const target = StockLevel.create(input.stock).value;
    const reason = NonEmptyText.create(input.reason, "motivo do ajuste", { min: 3, max: 200 });

    const material = await this.materials.findById(actor.tenantId, materialId);
    if (!material) throw new NotFoundError("Material não encontrado.");

    const difference = toCents(target - material.stock);
    if (difference === 0) {
      throw new ValidationError("O saldo informado é igual ao atual.", "stock");
    }

    return this.movements.register({
      tenantId: actor.tenantId,
      materialId: material.id,
      quantity: difference,
      type: "ADJUSTMENT",
      note: reason.value,
      unitCost: null,
      userId: actor.userId,
      userName: actor.name,
    });
  }
}

export class ListStockMovementsUseCase {
  constructor(private readonly movements: StockMovementRepository) {}

  execute(input: {
    tenantId: Uuid;
    materialId?: Uuid;
    type?: StockMovementType;
    sinceDays?: number;
    page: number;
    pageSize: number;
  }): Promise<{ items: StockMovement[]; total: number }> {
    return this.movements.listByTenant(input);
  }
}
