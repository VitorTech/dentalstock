/**
 * Procedure composition use cases.
 *
 * They define WHAT each procedure consumes. Executing it — deducting stock and
 * recording history — belongs to the clinical module.
 */
import type { Procedure } from "@/modules/catalog/domain";
import { BusinessRuleError, NonEmptyText, NotFoundError, Quantity, type Uuid } from "@/shared/domain";
import type { InstrumentRepository, MaterialRepository, ProcedureRepository } from "../ports";

export class ListProceduresUseCase {
  constructor(private readonly procedures: ProcedureRepository) {}

  execute(tenantId: Uuid, search?: string): Promise<Procedure[]> {
    return this.procedures.listByTenant(tenantId, search);
  }
}

export class CreateProcedureUseCase {
  constructor(private readonly procedures: ProcedureRepository) {}

  async execute(
    tenantId: Uuid,
    input: { name: unknown; category?: unknown; description?: unknown }
  ): Promise<Procedure> {
    const name = NonEmptyText.create(input.name, "nome do procedimento");

    const category =
      typeof input.category === "string" && input.category.trim() !== ""
        ? NonEmptyText.create(input.category, "especialidade", { min: 1, max: 120 }).value
        : null;

    const description =
      typeof input.description === "string" && input.description.trim() !== ""
        ? NonEmptyText.create(input.description, "descrição", { min: 1, max: 1000 }).value
        : null;

    return this.procedures.create({ tenantId, name: name.value, category, description });
  }
}

export class DeleteProcedureUseCase {
  constructor(private readonly procedures: ProcedureRepository) {}

  async execute(tenantId: Uuid, id: Uuid): Promise<void> {
    const existing = await this.procedures.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Procedimento não encontrado.");
    await this.procedures.delete(tenantId, id);
  }
}

/**
 * Duplicates a procedure with its whole item list.
 *
 * It exists because variations share almost everything — "Class I restoration"
 * and "Class II" differ by two items. Without it, each variation is rebuilt
 * item by item, which is exactly where catalogs end up incomplete.
 */
export class DuplicateProcedureUseCase {
  constructor(private readonly procedures: ProcedureRepository) {}

  async execute(tenantId: Uuid, id: Uuid, input: { name?: unknown }): Promise<Procedure> {
    const original = await this.procedures.findById(tenantId, id);
    if (!original) throw new NotFoundError("Procedimento não encontrado.");

    const name =
      typeof input.name === "string" && input.name.trim() !== ""
        ? NonEmptyText.create(input.name, "nome do procedimento").value
        : `${original.name} (cópia)`.slice(0, 200);

    return this.procedures.duplicate(tenantId, id, name);
  }
}

/** Links a material to a procedure, checking both belong to the clinic. */
export class LinkMaterialToProcedureUseCase {
  constructor(
    private readonly procedures: ProcedureRepository,
    private readonly materials: MaterialRepository
  ) {}

  async execute(tenantId: Uuid, procedureId: Uuid, input: { materialId: unknown; quantity: unknown }) {
    const quantity = Quantity.create(input.quantity);
    const materialId = String(input.materialId ?? "");

    const [procedure, material] = await Promise.all([
      this.procedures.findById(tenantId, procedureId),
      this.materials.findById(tenantId, materialId),
    ]);
    if (!procedure || !material) {
      throw new NotFoundError("Procedimento ou material não encontrado.");
    }
    if (procedure.materials.some((pm) => pm.materialId === materialId)) {
      throw new BusinessRuleError("Este material já está associado a este procedimento.");
    }

    await this.procedures.addMaterial(tenantId, procedureId, materialId, quantity.value);
    return this.procedures.findById(tenantId, procedureId);
  }
}

export class LinkInstrumentToProcedureUseCase {
  constructor(
    private readonly procedures: ProcedureRepository,
    private readonly instruments: InstrumentRepository
  ) {}

  async execute(
    tenantId: Uuid,
    procedureId: Uuid,
    input: { instrumentId: unknown; quantity: unknown }
  ) {
    const quantity = Quantity.create(input.quantity);
    const instrumentId = String(input.instrumentId ?? "");

    const [procedure, instrument] = await Promise.all([
      this.procedures.findById(tenantId, procedureId),
      this.instruments.findById(tenantId, instrumentId),
    ]);
    if (!procedure || !instrument) {
      throw new NotFoundError("Procedimento ou instrumental não encontrado.");
    }
    if (procedure.instruments.some((pi) => pi.instrumentId === instrumentId)) {
      throw new BusinessRuleError("Este instrumental já está associado a este procedimento.");
    }

    await this.procedures.addInstrument(tenantId, procedureId, instrumentId, quantity.value);
    return this.procedures.findById(tenantId, procedureId);
  }
}

export class UpdateProcedureItemQuantityUseCase {
  constructor(private readonly procedures: ProcedureRepository) {}

  async execute(
    tenantId: Uuid,
    kind: "MATERIAL" | "INSTRUMENT",
    linkId: Uuid,
    quantityRaw: unknown
  ): Promise<void> {
    const quantity = Quantity.create(quantityRaw);
    if (kind === "MATERIAL") {
      await this.procedures.updateMaterialQuantity(tenantId, linkId, quantity.value);
    } else {
      await this.procedures.updateInstrumentQuantity(tenantId, linkId, quantity.value);
    }
  }
}

export class RemoveProcedureItemUseCase {
  constructor(private readonly procedures: ProcedureRepository) {}

  async execute(tenantId: Uuid, kind: "MATERIAL" | "INSTRUMENT", linkId: Uuid): Promise<void> {
    if (kind === "MATERIAL") {
      await this.procedures.removeMaterial(tenantId, linkId);
    } else {
      await this.procedures.removeInstrument(tenantId, linkId);
    }
  }
}
