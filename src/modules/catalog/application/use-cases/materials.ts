/**
 * Material use cases.
 *
 * Each class orchestrates ONE operation (SRP). Validation comes from the value
 * objects, persistence from the ports.
 */
import { ImageUrl, type Material } from "@/modules/catalog/domain";
import { CalendarDate, Money, NonEmptyText, NotFoundError, StockLevel, type Uuid, ValidationError } from "@/shared/domain";
import type { MaterialRepository, MaterialUpdate, SupplierRepository } from "../ports";

export class ListMaterialsUseCase {
  constructor(private readonly materials: MaterialRepository) {}

  execute(tenantId: Uuid): Promise<Material[]> {
    return this.materials.listByTenant(tenantId);
  }
}

export class CreateMaterialUseCase {
  constructor(private readonly materials: MaterialRepository) {}

  async execute(
    tenantId: Uuid,
    input: {
      name: unknown;
      unit: unknown;
      category?: unknown;
      imageUrl?: unknown;
      stock?: unknown;
      minStock?: unknown;
      unitCost?: unknown;
      expiresAt?: unknown;
    }
  ): Promise<Material> {
    const name = NonEmptyText.create(input.name, "nome do material");
    const unit = NonEmptyText.create(input.unit, "unidade", { min: 1, max: 20 });
    return this.materials.create({
      tenantId,
      name: name.value,
      unit: unit.value,
      category: NonEmptyText.optional(input.category, "categoria"),
      imageUrl: ImageUrl.optional(input.imageUrl),
      stock: input.stock === undefined ? 0 : StockLevel.create(input.stock).value,
      minStock: input.minStock === undefined ? 0 : StockLevel.create(input.minStock, "minStock").value,
      supplierId: null,
      unitCost: Money.optional(input.unitCost),
      expiresAt: CalendarDate.optional(input.expiresAt, "expiresAt"),
    });
  }
}

/**
 * Updates a material's catalog entry.
 *
 * Note what this use case does NOT do: change the balance. That is deliberate —
 * the balance only moves through a recorded movement (entry, justified
 * adjustment, consumption), in the inventory module. While direct editing
 * existed, stock changed without a trace and "material went missing" was a
 * question with no answer.
 */
export class UpdateMaterialUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly suppliers: SupplierRepository
  ) {}

  async execute(
    tenantId: Uuid,
    id: Uuid,
    input: {
      minStock?: unknown;
      supplierId?: unknown;
      unitCost?: unknown;
      expiresAt?: unknown;
    }
  ): Promise<Material> {
    const existing = await this.materials.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Material não encontrado.");

    const data: MaterialUpdate = {};
    if (input.minStock !== undefined) {
      data.minStock = StockLevel.create(input.minStock, "minStock").value;
    }
    if (input.unitCost !== undefined) data.unitCost = Money.optional(input.unitCost);
    if (input.expiresAt !== undefined) {
      data.expiresAt = CalendarDate.optional(input.expiresAt, "expiresAt");
    }

    if (input.supplierId !== undefined) {
      if (input.supplierId === null || input.supplierId === "") {
        data.supplierId = null;
      } else {
        const supplierId = String(input.supplierId);
        // Confirms the supplier belongs to the same clinic: without this, an
        // id from another clinic could be linked (OWASP A01).
        const supplier = await this.suppliers.findById(tenantId, supplierId);
        if (!supplier) throw new NotFoundError("Fornecedor não encontrado.");
        data.supplierId = supplierId;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError("Nada para atualizar.");
    }
    return this.materials.update(tenantId, id, data);
  }
}

