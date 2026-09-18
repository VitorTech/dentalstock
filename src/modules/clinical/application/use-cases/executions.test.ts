/**
 * Finalization and reversal tests.
 *
 * Uses in-memory repositories instead of mocks: the ports are already
 * interfaces, and a complete fake lets the test check the EFFECT (what was
 * written) rather than which calls happened. No database starts here.
 *
 * The central case is an appointment with two procedures competing for the
 * same material — the rule the session's running balance exists to protect.
 */
import { describe, expect, it } from "vitest";
import type { MaterialRepository, ProcedureRepository } from "@/modules/catalog/application";
import type { Material, Procedure } from "@/modules/catalog/domain";
import type { ProcedureExecution } from "@/modules/clinical/domain";
import type { SecretGenerator } from "@/shared/application";
import { type AuthenticatedActor, NotFoundError, type Uuid, ValidationError } from "@/shared/domain";
import type { ExecutionCommitInput, ProcedureExecutionRepository } from "../ports";
import { FinalizeProcedureUseCase, ReverseExecutionUseCase } from "./executions";

const TENANT = "clinica-1";

const OUTRA = "clinica-2";

const actor: AuthenticatedActor = {
  userId: "u1",
  tenantId: TENANT,
  role: "MEMBER",
  email: "dra@clinica.com",
  name: "Dra. Marina",
};

function material(over: Partial<Material> = {}): Material {
  return {
    id: "m1",
    tenantId: TENANT,
    name: "Material",
    unit: "un",
    category: null,
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

function procedure(over: Partial<Procedure> = {}): Procedure {
  return {
    id: "p1",
    tenantId: TENANT,
    name: "Procedimento",
    category: null,
    description: null,
    materials: [],
    instruments: [],
    ...over,
  };
}

class InMemoryProcedures implements Partial<ProcedureRepository> {
  constructor(private readonly items: Procedure[]) {}

  async findById(tenantId: Uuid, id: Uuid): Promise<Procedure | null> {
    // Reproduces the real guarantee: an id from another clinic simply does not exist.
    return this.items.find((p) => p.id === id && p.tenantId === tenantId) ?? null;
  }
}

class InMemoryMaterials implements Partial<MaterialRepository> {
  constructor(private readonly items: Material[]) {}

  async findManyByIds(tenantId: Uuid, ids: Uuid[]): Promise<Material[]> {
    return this.items.filter((m) => m.tenantId === tenantId && ids.includes(m.id));
  }
}

class InMemoryExecutions implements Partial<ProcedureExecutionRepository> {
  commits: {
    tenantId: Uuid;
    sessionId: Uuid | null;
    userId: Uuid | null;
    userName: string | null;
    executions: ExecutionCommitInput[];
  }[] = [];

  estornos: { executionId: Uuid; returns: { materialId: Uuid; quantity: number }[] }[] = [];

  registros = new Map<Uuid, ProcedureExecution>();

  async commit(input: (typeof this.commits)[number]): Promise<void> {
    this.commits.push(input);
  }

  async findById(tenantId: Uuid, id: Uuid): Promise<ProcedureExecution | null> {
    return this.registros.get(id) ?? null;
  }

  async reverse(input: {
    tenantId: Uuid;
    executionId: Uuid;
    returns: { materialId: Uuid; quantity: number }[];
  }): Promise<void> {
    this.estornos.push({ executionId: input.executionId, returns: input.returns });
  }
}

const secrets: SecretGenerator = { token: () => "sessao-fixa" };

function build(procedures: Procedure[], materials: Material[]) {
  const execucoes = new InMemoryExecutions();
  const uc = new FinalizeProcedureUseCase(
    new InMemoryProcedures(procedures) as unknown as ProcedureRepository,
    new InMemoryMaterials(materials) as unknown as MaterialRepository,
    execucoes as unknown as ProcedureExecutionRepository,
    secrets
  );
  return { uc, execucoes };
}

describe("FinalizeProcedureUseCase — single procedure", () => {
  it("deducts the material and does not mark a session", async () => {
    const { uc, execucoes } = build([procedure()], [material({ stock: 10 })]);

    const r = await uc.execute(actor, {
      procedureId: "p1",
      materials: [{ materialId: "m1", quantity: 3 }],
    });

    expect(r).toEqual({ ok: true, cost: null, procedures: 1 });
    expect(execucoes.commits).toHaveLength(1);

    const commit = execucoes.commits[0];
    // A grouper around a single item tells nobody anything — null on purpose.
    expect(commit.sessionId).toBeNull();
    expect(commit.userName).toBe("Dra. Marina");
    expect(commit.executions[0].deductions).toEqual([{ materialId: "m1", quantity: 3 }]);
  });

  it("records the authorship of whoever finalized it", async () => {
    const { uc, execucoes } = build([procedure()], [material()]);
    await uc.execute(actor, { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] });

    expect(execucoes.commits[0].userId).toBe("u1");
    expect(execucoes.commits[0].userName).toBe("Dra. Marina");
  });

  it("returns the shortages and writes NOTHING", async () => {
    const { uc, execucoes } = build([procedure()], [material({ stock: 1 })]);

    const r = await uc.execute(actor, {
      procedureId: "p1",
      materials: [{ materialId: "m1", quantity: 5 }],
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.shortages).toEqual([
        { materialId: "m1", name: "Material", requested: 5, available: 1, unit: "un" },
      ]);
    }
    expect(execucoes.commits).toHaveLength(0);
  });

  it("rejects a procedure from another clinic", async () => {
    const { uc } = build([procedure({ tenantId: OUTRA })], [material()]);

    await expect(
      uc.execute(actor, { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("FinalizeProcedureUseCase — appointment with several procedures", () => {
  it("shares the balance across procedures of the same appointment", async () => {
    // The material has 5; each procedure asks for 3. On their own both would
    // pass, but together they exceed it — exactly what the running balance guards.
    const { uc, execucoes } = build(
      [procedure({ id: "a" }), procedure({ id: "b" })],
      [material({ id: "m1", stock: 5 })]
    );

    const r = await uc.execute(actor, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 3 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 3 }] },
      ],
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      // The second one is what flags it: only 2 are left by then.
      expect(r.shortages).toEqual([
        { materialId: "m1", name: "Material", requested: 3, available: 2, unit: "un" },
      ]);
    }
    // Nothing was written — not even the first one, which would have fit alone.
    expect(execucoes.commits).toHaveLength(0);
  });

  it("accepts when the sum fits in the balance", async () => {
    const { uc, execucoes } = build(
      [procedure({ id: "a" }), procedure({ id: "b" })],
      [material({ id: "m1", stock: 6 })]
    );

    const r = await uc.execute(actor, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 3 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 3 }] },
      ],
    });

    expect(r.ok).toBe(true);
    // A single transaction with both executions — not two commits.
    expect(execucoes.commits).toHaveLength(1);
    expect(execucoes.commits[0].executions).toHaveLength(2);
    expect(execucoes.commits[0].sessionId).toBe("sessao-fixa");
  });

  it("keeps the records separate, one per procedure", async () => {
    const { uc, execucoes } = build(
      [
        procedure({ id: "a", name: "Restauração", category: "Dentística" }),
        procedure({ id: "b", name: "Profilaxia", category: "Prevenção" }),
      ],
      [material({ id: "m1", stock: 10 })]
    );

    await uc.execute(actor, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 1 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 1 }] },
      ],
    });

    const names = execucoes.commits[0].executions.map((e) => e.procedureName);
    expect(names).toEqual(["Restauração", "Profilaxia"]);
  });

  it("adds up the cost of the appointment's procedures", async () => {
    const { uc } = build(
      [procedure({ id: "a" }), procedure({ id: "b" })],
      [material({ id: "m1", stock: 10, unitCost: 2.5 })]
    );

    const r = await uc.execute(actor, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 2 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 4 }] },
      ],
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBe(15);
  });

  it("leaves the cost null when no item has a price", async () => {
    const { uc } = build([procedure()], [material({ unitCost: null })]);
    const r = await uc.execute(actor, {
      procedureId: "p1",
      materials: [{ materialId: "m1", quantity: 1 }],
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBeNull();
  });
});

describe("FinalizeProcedureUseCase — request validation", () => {
  const casos: [string, Record<string, unknown>][] = [
    ["sem procedure algum", { procedures: [] }],
    ["sem procedureId", { materials: [{ materialId: "m1", quantity: 1 }] }],
    ["sem materiais", { procedureId: "p1", materials: [] }],
    ["materiais não é lista", { procedureId: "p1", materials: "tudo" }],
    ["materialId ausente", { procedureId: "p1", materials: [{ quantity: 1 }] }],
    ["quantidade zero", { procedureId: "p1", materials: [{ materialId: "m1", quantity: 0 }] }],
    [
      "quantidade negativa",
      { procedureId: "p1", materials: [{ materialId: "m1", quantity: -2 }] },
    ],
  ];

  it.each(casos)("recusa pedido %s", async (_caso, corpo) => {
    const { uc } = build([procedure()], [material()]);
    await expect(uc.execute(actor, corpo)).rejects.toThrow(ValidationError);
  });

  it("rejects the same procedure sent twice", async () => {
    const { uc } = build([procedure()], [material()]);

    await expect(
      uc.execute(actor, {
        procedures: [
          { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] },
          { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] },
        ],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects more procedures than an appointment can hold", async () => {
    const { uc } = build([procedure()], [material()]);
    const demais = Array.from({ length: 21 }, (_, i) => ({
      procedureId: `p${i}`,
      materials: [{ materialId: "m1", quantity: 1 }],
    }));

    await expect(uc.execute(actor, { procedures: demais })).rejects.toThrow(ValidationError);
  });

  it("rejects an absurdly long material list", async () => {
    const { uc } = build([procedure()], [material()]);
    const items = Array.from({ length: 201 }, () => ({ materialId: "m1", quantity: 1 }));

    await expect(uc.execute(actor, { procedureId: "p1", materials: items })).rejects.toThrow(
      ValidationError
    );
  });
});

describe("ReverseExecutionUseCase", () => {
  function montarEstorno(execucao: ProcedureExecution | null) {
    const repo = new InMemoryExecutions();
    if (execucao) repo.registros.set(execucao.id, execucao);
    const uc = new ReverseExecutionUseCase(repo as unknown as ProcedureExecutionRepository);
    return { uc, repo };
  }

  const base: ProcedureExecution = {
    id: "e1",
    procedureId: "p1",
    procedureName: "Restauração",
    category: null,
    createdAt: new Date(),
    userName: "Dra. Marina",
    sessionId: null,
    reversedAt: null,
    reversedByName: null,
    totalCost: 15,
    items: [
      { id: "1", kind: "MATERIAL", name: "Resina", quantity: 2, unit: "g", materialId: "m1", unitCost: 2.5 },
      { id: "2", kind: "INSTRUMENT", name: "Espelho", quantity: 1, unit: "un", materialId: null, unitCost: null },
    ],
  };

  it("returns only the materials and records the author", async () => {
    const { uc, repo } = montarEstorno(base);
    await uc.execute(actor, "e1");

    expect(repo.estornos).toEqual([
      { executionId: "e1", returns: [{ materialId: "m1", quantity: 2 }] },
    ]);
  });

  it("refuses to reverse a nonexistent record", async () => {
    const { uc } = montarEstorno(null);
    await expect(uc.execute(actor, "fantasma")).rejects.toThrow(NotFoundError);
  });

  it("refuses a duplicate reversal and never calls the repository", async () => {
    const { uc, repo } = montarEstorno({ ...base, reversedAt: new Date() });
    await expect(uc.execute(actor, "e1")).rejects.toThrow();
    expect(repo.estornos).toHaveLength(0);
  });
});
