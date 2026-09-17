/**
 * Casos de uso de materiais.
 *
 * Cada classe orquestra UMA operação (SRP). A validação vem dos Value Objects,
 * a persistência das portas.
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
 * Atualiza o cadastro de um material.
 *
 * Note o que este caso de uso NÃO faz: alterar o saldo. Isso é deliberado —
 * saldo só muda por movimento registrado (entrada, ajuste justificado, consumo,
 * balanço), em `stock.ts`. Enquanto a edição direta existia, o estoque mudava
 * sem deixar rastro e "sumiu material" era uma pergunta sem resposta.
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
        // Confirma que o fornecedor é da mesma clínica: sem isso, um id de
        // outra clínica poderia ser vinculado (OWASP A01).
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

