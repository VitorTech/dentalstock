/**
 * Movement use cases: entry, adjustment and ledger listing.
 *
 * The rule running through this file: no balance ever changes without a
 * matching movement.
 */
import type { MaterialRepository } from "@/modules/catalog/application";
import type { Material } from "@/modules/catalog/domain";
import { canSeeCosts } from "@/modules/identity/domain";
import { type StockMovement, type StockMovementType, weightedAverageCost } from "@/modules/inventory/domain";
import { type AuthenticatedActor, Money, NonEmptyText, NotFoundError, Quantity, StockLevel, type Uuid, ValidationError, toCents } from "@/shared/domain";
import type { StockMovementRepository } from "../ports";

/**
 * Material entry (purchase/restock).
 *
 * When the invoice carries a price, the material's cost is recomputed as a
 * weighted average instead of simply replaced — the decision and the reasoning
 * live in `weightedAverageCost`.
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
    // Entering a price is a privilege of whoever can see costs. A value sent by
    // another role is IGNORED, not rejected: receiving what arrived is
    // legitimate assistant work and must not fail over one extra field. This
    // rule used to live in the HTTP route; here it holds for every entry.
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
 * Manual balance adjustment.
 *
 * The screen takes the balance that should be there (that is how people think:
 * "there are actually 12"), and here it is converted into the difference. The
 * reason is mandatory: an adjustment without justification is exactly the
 * record that explains nothing when stock does not add up.
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
