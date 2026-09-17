import { describe, expect, it } from "vitest";
import type { Material, Procedure } from "@/modules/catalog/domain";
import { BusinessRuleError } from "@/shared/domain";
import type { ProcedureExecution } from "./entities";
import { planConsumption, planReversal, summarizeCost } from "./policies";

const AGORA = new Date("2026-09-14T12:00:00.000Z");

function material(over: Partial<Material> = {}): Material {
  return {
    id: "m1",
    tenantId: "t1",
    name: "Resina Composta",
    unit: "g",
    category: "Restaurador",
    imageUrl: null,
    stock: 10,
    minStock: 0,
    supplierId: null,
    supplier: null,
    unitCost: null,
    expiresAt: null,
    ...over,
  };
}

function procedimento(over: Partial<Procedure> = {}): Procedure {
  return {
    id: "p1",
    tenantId: "t1",
    name: "Restauração",
    category: "Dentística",
    description: null,
    materials: [],
    instruments: [],
    ...over,
  };
}

function execucao(over: Partial<ProcedureExecution> = {}): ProcedureExecution {
  return {
    id: "e1",
    procedureId: "p1",
    procedureName: "Restauração",
    category: "Dentística",
    createdAt: AGORA,
    items: [],
    userName: "Dra. Marina",
    sessionId: null,
    reversedAt: null,
    reversedByName: null,
    totalCost: null,
    ...over,
  };
}

describe("summarizeCost", () => {
  it("ignora instrumental — ele volta para a bancada", () => {
    const r = summarizeCost([
      { kind: "MATERIAL", quantity: 2, unitCost: 2.5 },
      { kind: "INSTRUMENT", quantity: 1, unitCost: 300 },
    ]);
    expect(r.total).toBe(5);
    expect(r.counted).toBe(1);
  });

  it("conta os materiais sem preço para a tela avisar que o total é parcial", () => {
    const r = summarizeCost([
      { kind: "MATERIAL", quantity: 2, unitCost: 2.5 },
      { kind: "MATERIAL", quantity: 1, unitCost: null },
    ]);
    expect(r.total).toBe(5);
    expect(r.missing).toBe(1);
    expect(r.counted).toBe(2);
  });

  it("lista vazia não quebra", () => {
    expect(summarizeCost([])).toEqual({ total: 0, missing: 0, counted: 0 });
  });
});

describe("planConsumption", () => {
  it("baixa material e registra instrumental sem consumi-lo", () => {
    const luva = material({ id: "luva", name: "Luva", unit: "par", stock: 10, unitCost: 2 });
    const proc = procedimento({
      instruments: [
        {
          id: "pi1",
          instrumentId: "i1",
          quantity: 1,
          instrument: {
            id: "i1",
            tenantId: "t1",
            name: "Espelho",
            category: null,
            imageUrl: null,
            stock: 5,
          },
        },
      ],
    });

    const { plan, shortages } = planConsumption(proc, [{ materialId: "luva", quantity: 2 }], [luva]);

    expect(shortages).toHaveLength(0);
    expect(plan.deductions).toEqual([
      { materialId: "luva", quantity: 2, name: "Luva", unit: "par" },
    ]);

    const instrumental = plan.historyItems.find((i) => i.kind === "INSTRUMENT");
    expect(instrumental).toBeDefined();
    // Instrumental entra no histórico mas NUNCA na lista de baixas.
    expect(plan.deductions.some((d) => d.materialId === "i1")).toBe(false);
    expect(instrumental?.unitCost).toBeNull();
  });

  it("acusa falta e não devolve nenhuma baixa parcial", () => {
    const m = material({ id: "m1", stock: 1 });
    const { plan, shortages } = planConsumption(
      procedimento(),
      [{ materialId: "m1", quantity: 5 }],
      [m]
    );

    expect(shortages).toEqual([
      { materialId: "m1", name: "Resina Composta", requested: 5, available: 1, unit: "g" },
    ]);
    expect(plan.deductions).toHaveLength(0);
    expect(plan.historyItems).toHaveLength(0);
  });

  it("uma falta entre vários itens anula o plano inteiro", () => {
    const ok = material({ id: "ok", stock: 100 });
    const falta = material({ id: "falta", stock: 0 });

    const { plan, shortages } = planConsumption(
      procedimento(),
      [
        { materialId: "ok", quantity: 1 },
        { materialId: "falta", quantity: 1 },
      ],
      [ok, falta]
    );

    expect(shortages).toHaveLength(1);
    expect(plan.deductions).toHaveLength(0);
  });

  it("consumir exatamente o saldo é permitido", () => {
    const m = material({ id: "m1", stock: 3 });
    const { shortages } = planConsumption(procedimento(), [{ materialId: "m1", quantity: 3 }], [m]);
    expect(shortages).toHaveLength(0);
  });

  it("material fora da clínica é recusado como regra de negócio", () => {
    expect(() =>
      planConsumption(procedimento(), [{ materialId: "de-outra-clinica", quantity: 1 }], [])
    ).toThrow(BusinessRuleError);
  });

  it("congela o custo unitário do dia no item de histórico", () => {
    const m = material({ id: "m1", stock: 10, unitCost: 2.5 });
    const { plan } = planConsumption(procedimento(), [{ materialId: "m1", quantity: 2 }], [m]);

    expect(plan.historyItems[0].unitCost).toBe(2.5);
    expect(plan.historyItems[0].materialId).toBe("m1");
    expect(plan.cost.total).toBe(5);
  });
});

describe("planReversal", () => {
  it("devolve apenas materiais, nunca instrumental", () => {
    const e = execucao({
      items: [
        { id: "1", kind: "MATERIAL", name: "Luva", quantity: 2, unit: "par", materialId: "luva", unitCost: 2 },
        { id: "2", kind: "INSTRUMENT", name: "Espelho", quantity: 1, unit: "un", materialId: null, unitCost: null },
      ],
    });

    expect(planReversal(e).returns).toEqual([{ materialId: "luva", quantity: 2 }]);
  });

  it("recusa estorno duplicado", () => {
    const e = execucao({
      reversedAt: AGORA,
      items: [
        { id: "1", kind: "MATERIAL", name: "Luva", quantity: 1, unit: "par", materialId: "luva", unitCost: null },
      ],
    });
    expect(() => planReversal(e)).toThrow(BusinessRuleError);
  });

  it("ignora item cujo material foi excluído do catálogo", () => {
    const e = execucao({
      items: [
        { id: "1", kind: "MATERIAL", name: "Vivo", quantity: 1, unit: "un", materialId: "vivo", unitCost: null },
        { id: "2", kind: "MATERIAL", name: "Excluído", quantity: 9, unit: "un", materialId: null, unitCost: null },
      ],
    });
    expect(planReversal(e).returns).toEqual([{ materialId: "vivo", quantity: 1 }]);
  });

  it("recusa quando não há nada para devolver", () => {
    const e = execucao({
      items: [
        { id: "1", kind: "INSTRUMENT", name: "Espelho", quantity: 1, unit: "un", materialId: null, unitCost: null },
      ],
    });
    expect(() => planReversal(e)).toThrow(BusinessRuleError);
  });
});
