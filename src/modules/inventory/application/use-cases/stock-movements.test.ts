/**
 * Stock entry tests.
 *
 * As in `executions.test.ts`, the ports are implemented in memory and the test
 * checks what was RECORDED — here, mainly, whether the cost came through.
 */
import { describe, expect, it } from "vitest";
import type { MaterialRepository } from "@/modules/catalog/application";
import type { Material } from "@/modules/catalog/domain";
import { type AuthenticatedActor, NotFoundError, type Uuid, ValidationError } from "@/shared/domain";
import type { StockMovementRepository } from "../ports";
import { RegisterStockEntryUseCase } from "./stock-movements";

const TENANT = "clinica-1";

type RegisterInput = Parameters<StockMovementRepository["register"]>[0];

function actor(role: AuthenticatedActor["role"]): AuthenticatedActor {
  return { userId: "u1", tenantId: TENANT, role, email: "equipe@clinica.com", name: "Equipe" };
}

function material(over: Partial<Material> = {}): Material {
  return {
    id: "m1",
    tenantId: TENANT,
    name: "Resina",
    unit: "g",
    category: null,
    imageUrl: null,
    stock: 10,
    minStock: 0,
    supplierId: null,
    supplier: null,
    unitCost: 2,
    expiresAt: null,
    ...over,
  };
}

class InMemoryMaterials implements Partial<MaterialRepository> {
  constructor(private readonly items: Material[]) {}

  async findById(tenantId: Uuid, id: Uuid): Promise<Material | null> {
    return this.items.find((m) => m.id === id && m.tenantId === tenantId) ?? null;
  }
}

class InMemoryMovements implements Partial<StockMovementRepository> {
  readonly recorded: RegisterInput[] = [];

  constructor(private readonly base: Material) {}

  async register(input: RegisterInput): Promise<Material> {
    this.recorded.push(input);
    return {
      ...this.base,
      stock: this.base.stock + input.quantity,
      unitCost: input.newMaterialCost === undefined ? this.base.unitCost : input.newMaterialCost,
    };
  }
}

function build(base = material()) {
  const movements = new InMemoryMovements(base);
  const useCase = new RegisterStockEntryUseCase(
    new InMemoryMaterials([base]) as unknown as MaterialRepository,
    movements as unknown as StockMovementRepository
  );
  return { useCase, movements };
}

describe("RegisterStockEntryUseCase", () => {
  it("whoever sees costs recomputes the weighted average", async () => {
    const { useCase, movements } = build();

    const atualizado = await useCase.execute(actor("MEMBER"), {
      materialId: "m1",
      quantity: 10,
      unitCost: 4,
    });

    expect(movements.recorded[0]).toMatchObject({ type: "RESTOCK", quantity: 10, unitCost: 4 });
    // 10 g at R$ 2 + 10 g at R$ 4 = an average of R$ 3.
    expect(movements.recorded[0].newMaterialCost).toBe(3);
    expect(atualizado.unitCost).toBe(3);
  });

  it("the assistant registers the entry, but the sent price is ignored", async () => {
    const { useCase, movements } = build();

    const atualizado = await useCase.execute(actor("ASSISTANT"), {
      materialId: "m1",
      quantity: 5,
      unitCost: 999,
    });

    expect(movements.recorded).toHaveLength(1);
    expect(movements.recorded[0].quantity).toBe(5);
    expect(movements.recorded[0].unitCost).toBeNull();
    expect(movements.recorded[0].newMaterialCost).toBeUndefined();
    expect(atualizado.unitCost).toBe(2);
  });

  it("an assistant with an invalid price does not fail: the field is never read", async () => {
    const { useCase, movements } = build();

    await useCase.execute(actor("ASSISTANT"), { materialId: "m1", quantity: 1, unitCost: "abc" });

    expect(movements.recorded[0].unitCost).toBeNull();
  });

  it("records author and note on the movement", async () => {
    const { useCase, movements } = build();

    await useCase.execute(actor("MEMBER"), { materialId: "m1", quantity: 1, note: "  NF 123  " });

    expect(movements.recorded[0]).toMatchObject({ userId: "u1", userName: "Equipe", note: "NF 123" });
  });

  it("rejects an invalid quantity before writing", async () => {
    const { useCase, movements } = build();

    await expect(
      useCase.execute(actor("MEMBER"), { materialId: "m1", quantity: 0 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(movements.recorded).toHaveLength(0);
  });

  it("a material from another clinic does not exist", async () => {
    const { useCase, movements } = build(material({ tenantId: "clinica-2" }));

    await expect(
      useCase.execute(actor("MEMBER"), { materialId: "m1", quantity: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(movements.recorded).toHaveLength(0);
  });
});
