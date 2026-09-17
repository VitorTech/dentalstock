/** Casos de uso de fornecedores. */
import type { Supplier } from "@/modules/catalog/domain";
import { NonEmptyText, NotFoundError, type Uuid, ValidationError } from "@/shared/domain";
import type { SupplierRepository } from "../ports";

export class ListSuppliersUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  execute(tenantId: Uuid): Promise<Supplier[]> {
    return this.suppliers.listByTenant(tenantId);
  }
}

export class CreateSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(
    tenantId: Uuid,
    input: { name: unknown; phone?: unknown; email?: unknown; notes?: unknown }
  ): Promise<Supplier> {
    const name = NonEmptyText.create(input.name, "nome do fornecedor");
    return this.suppliers.create({
      tenantId,
      name: name.value,
      phone: NonEmptyText.optional(input.phone, "telefone", 40),
      email: NonEmptyText.optional(input.email, "e-mail", 160),
      notes: NonEmptyText.optional(input.notes, "observações", 500),
    });
  }
}

export class UpdateSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(
    tenantId: Uuid,
    id: Uuid,
    input: { name?: unknown; phone?: unknown; email?: unknown; notes?: unknown }
  ): Promise<Supplier> {
    const existing = await this.suppliers.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Fornecedor não encontrado.");

    const data: Partial<Omit<Supplier, "id" | "tenantId">> = {};
    if (input.name !== undefined) {
      data.name = NonEmptyText.create(input.name, "nome do fornecedor").value;
    }
    if (input.phone !== undefined) data.phone = NonEmptyText.optional(input.phone, "telefone", 40);
    if (input.email !== undefined) data.email = NonEmptyText.optional(input.email, "e-mail", 160);
    if (input.notes !== undefined) data.notes = NonEmptyText.optional(input.notes, "observações", 500);

    if (Object.keys(data).length === 0) throw new ValidationError("Nada para atualizar.");
    return this.suppliers.update(tenantId, id, data);
  }
}

export class DeleteSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(tenantId: Uuid, id: Uuid): Promise<void> {
    const existing = await this.suppliers.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Fornecedor não encontrado.");
    await this.suppliers.delete(tenantId, id);
  }
}
