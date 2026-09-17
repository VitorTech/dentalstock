/**
 * Testes da entrada de estoque.
 *
 * Como em `executions.test.ts`, as portas são implementadas em memória e o
 * teste confere o que foi GRAVADO — aqui, principalmente, se o custo entrou.
 */
import { describe, expect, it } from "vitest";
import type { MaterialRepository } from "@/modules/catalog/application";
import type { Material } from "@/modules/catalog/domain";
import { type AuthenticatedActor, NotFoundError, type Uuid, ValidationError } from "@/shared/domain";
import type { StockMovementRepository } from "../ports";
import { RegisterStockEntryUseCase } from "./stock-movements";

const TENANT = "clinica-1";

type RegisterInput = Parameters<StockMovementRepository["register"]>[0];

function ator(role: AuthenticatedActor["role"]): AuthenticatedActor {
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

class MaterialsEmMemoria implements Partial<MaterialRepository> {
  constructor(private readonly itens: Material[]) {}

  async findById(tenantId: Uuid, id: Uuid): Promise<Material | null> {
    return this.itens.find((m) => m.id === id && m.tenantId === tenantId) ?? null;
  }
}

class MovementsEmMemoria implements Partial<StockMovementRepository> {
  readonly gravados: RegisterInput[] = [];

  constructor(private readonly base: Material) {}

  async register(input: RegisterInput): Promise<Material> {
    this.gravados.push(input);
    return {
      ...this.base,
      stock: this.base.stock + input.quantity,
      unitCost: input.newMaterialCost === undefined ? this.base.unitCost : input.newMaterialCost,
    };
  }
}

function montar(base = material()) {
  const movements = new MovementsEmMemoria(base);
  const useCase = new RegisterStockEntryUseCase(
    new MaterialsEmMemoria([base]) as unknown as MaterialRepository,
    movements as unknown as StockMovementRepository
  );
  return { useCase, movements };
}

describe("RegisterStockEntryUseCase", () => {
  it("quem vê custo recalcula o custo médio ponderado", async () => {
    const { useCase, movements } = montar();

    const atualizado = await useCase.execute(ator("MEMBER"), {
      materialId: "m1",
      quantity: 10,
      unitCost: 4,
    });

    expect(movements.gravados[0]).toMatchObject({ type: "RESTOCK", quantity: 10, unitCost: 4 });
    // 10 g a R$ 2 + 10 g a R$ 4 = média de R$ 3.
    expect(movements.gravados[0].newMaterialCost).toBe(3);
    expect(atualizado.unitCost).toBe(3);
  });

  it("auxiliar dá entrada normalmente, mas o preço enviado é ignorado", async () => {
    const { useCase, movements } = montar();

    const atualizado = await useCase.execute(ator("ASSISTANT"), {
      materialId: "m1",
      quantity: 5,
      unitCost: 999,
    });

    expect(movements.gravados).toHaveLength(1);
    expect(movements.gravados[0].quantity).toBe(5);
    expect(movements.gravados[0].unitCost).toBeNull();
    expect(movements.gravados[0].newMaterialCost).toBeUndefined();
    expect(atualizado.unitCost).toBe(2);
  });

  it("auxiliar com preço inválido não falha: o campo nem é lido", async () => {
    const { useCase, movements } = montar();

    await useCase.execute(ator("ASSISTANT"), { materialId: "m1", quantity: 1, unitCost: "abc" });

    expect(movements.gravados[0].unitCost).toBeNull();
  });

  it("registra autor e observação no movimento", async () => {
    const { useCase, movements } = montar();

    await useCase.execute(ator("MEMBER"), { materialId: "m1", quantity: 1, note: "  NF 123  " });

    expect(movements.gravados[0]).toMatchObject({ userId: "u1", userName: "Equipe", note: "NF 123" });
  });

  it("recusa quantidade inválida antes de gravar", async () => {
    const { useCase, movements } = montar();

    await expect(
      useCase.execute(ator("MEMBER"), { materialId: "m1", quantity: 0 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(movements.gravados).toHaveLength(0);
  });

  it("material de outra clínica não existe", async () => {
    const { useCase, movements } = montar(material({ tenantId: "clinica-2" }));

    await expect(
      useCase.execute(ator("MEMBER"), { materialId: "m1", quantity: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(movements.gravados).toHaveLength(0);
  });
});
