/** Casos de uso de instrumentais. */
import { ImageUrl, type Instrument } from "@/modules/catalog/domain";
import { NonEmptyText, NotFoundError, StockLevel, type Uuid, ValidationError } from "@/shared/domain";
import type { InstrumentRepository } from "../ports";

export class ListInstrumentsUseCase {
  constructor(private readonly instruments: InstrumentRepository) {}

  execute(tenantId: Uuid): Promise<Instrument[]> {
    return this.instruments.listByTenant(tenantId);
  }
}

export class CreateInstrumentUseCase {
  constructor(private readonly instruments: InstrumentRepository) {}

  async execute(
    tenantId: Uuid,
    input: { name: unknown; category?: unknown; imageUrl?: unknown; stock?: unknown }
  ): Promise<Instrument> {
    const name = NonEmptyText.create(input.name, "nome do instrumental");

    return this.instruments.create({
      tenantId,
      name: name.value,
      category: NonEmptyText.optional(input.category, "categoria"),
      imageUrl: ImageUrl.optional(input.imageUrl),
      // Estoque é opcional no cadastro: quem ainda não contou o inventário
      // registra o instrumental agora e informa a quantidade depois.
      stock: input.stock === undefined ? 0 : StockLevel.create(input.stock).value,
    });
  }
}

export class UpdateInstrumentStockUseCase {
  constructor(private readonly instruments: InstrumentRepository) {}

  async execute(tenantId: Uuid, id: Uuid, input: { stock?: unknown }): Promise<Instrument> {
    const existing = await this.instruments.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Instrumental não encontrado.");

    // Quantidade é o único campo editável do inventário de instrumentais.
    if (input.stock === undefined) throw new ValidationError("Nada para atualizar.");

    return this.instruments.update(tenantId, id, {
      stock: StockLevel.create(input.stock).value,
    });
  }
}
