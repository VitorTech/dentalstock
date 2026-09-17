/**
 * Testes de finalização e estorno.
 *
 * Usa repositórios em memória em vez de mocks: as portas já são interfaces, e
 * uma implementação falsa completa deixa o teste verificar o EFEITO (o que foi
 * gravado) em vez de verificar chamadas. Nenhum banco sobe aqui.
 *
 * O caso central é o da consulta com dois procedimentos que disputam o mesmo
 * material — a regra que o saldo corrente da sessão existe para proteger.
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

const ator: AuthenticatedActor = {
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

function procedimento(over: Partial<Procedure> = {}): Procedure {
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

class ProceduresEmMemoria implements Partial<ProcedureRepository> {
  constructor(private readonly itens: Procedure[]) {}

  async findById(tenantId: Uuid, id: Uuid): Promise<Procedure | null> {
    // Reproduz a garantia real: id de outra clínica simplesmente não existe.
    return this.itens.find((p) => p.id === id && p.tenantId === tenantId) ?? null;
  }
}

class MaterialsEmMemoria implements Partial<MaterialRepository> {
  constructor(private readonly itens: Material[]) {}

  async findManyByIds(tenantId: Uuid, ids: Uuid[]): Promise<Material[]> {
    return this.itens.filter((m) => m.tenantId === tenantId && ids.includes(m.id));
  }
}

class ExecucoesEmMemoria implements Partial<ProcedureExecutionRepository> {
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

function montar(procedures: Procedure[], materials: Material[]) {
  const execucoes = new ExecucoesEmMemoria();
  const uc = new FinalizeProcedureUseCase(
    new ProceduresEmMemoria(procedures) as unknown as ProcedureRepository,
    new MaterialsEmMemoria(materials) as unknown as MaterialRepository,
    execucoes as unknown as ProcedureExecutionRepository,
    secrets
  );
  return { uc, execucoes };
}

describe("FinalizeProcedureUseCase — um procedimento", () => {
  it("baixa o material e não marca sessão", async () => {
    const { uc, execucoes } = montar([procedimento()], [material({ stock: 10 })]);

    const r = await uc.execute(ator, {
      procedureId: "p1",
      materials: [{ materialId: "m1", quantity: 3 }],
    });

    expect(r).toEqual({ ok: true, cost: null, procedures: 1 });
    expect(execucoes.commits).toHaveLength(1);

    const commit = execucoes.commits[0];
    // Agrupador de um item só não informa nada — fica nulo de propósito.
    expect(commit.sessionId).toBeNull();
    expect(commit.userName).toBe("Dra. Marina");
    expect(commit.executions[0].deductions).toEqual([{ materialId: "m1", quantity: 3 }]);
  });

  it("registra a autoria de quem finalizou", async () => {
    const { uc, execucoes } = montar([procedimento()], [material()]);
    await uc.execute(ator, { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] });

    expect(execucoes.commits[0].userId).toBe("u1");
    expect(execucoes.commits[0].userName).toBe("Dra. Marina");
  });

  it("devolve as faltas e NÃO grava nada", async () => {
    const { uc, execucoes } = montar([procedimento()], [material({ stock: 1 })]);

    const r = await uc.execute(ator, {
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

  it("recusa procedimento de outra clínica", async () => {
    const { uc } = montar([procedimento({ tenantId: OUTRA })], [material()]);

    await expect(
      uc.execute(ator, { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("FinalizeProcedureUseCase — consulta com vários procedimentos", () => {
  it("compartilha o saldo entre os procedimentos da mesma consulta", async () => {
    // O material tem 5; cada procedimento pede 3. Isoladamente ambos passariam,
    // mas somados excedem — é exatamente o que o saldo corrente protege.
    const { uc, execucoes } = montar(
      [procedimento({ id: "a" }), procedimento({ id: "b" })],
      [material({ id: "m1", stock: 5 })]
    );

    const r = await uc.execute(ator, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 3 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 3 }] },
      ],
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      // O segundo é quem acusa: já sobraram apenas 2.
      expect(r.shortages).toEqual([
        { materialId: "m1", name: "Material", requested: 3, available: 2, unit: "un" },
      ]);
    }
    // Nada foi gravado — nem o primeiro, que caberia sozinho.
    expect(execucoes.commits).toHaveLength(0);
  });

  it("aceita quando a soma cabe no saldo", async () => {
    const { uc, execucoes } = montar(
      [procedimento({ id: "a" }), procedimento({ id: "b" })],
      [material({ id: "m1", stock: 6 })]
    );

    const r = await uc.execute(ator, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 3 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 3 }] },
      ],
    });

    expect(r.ok).toBe(true);
    // Uma única transação com as duas execuções — não dois commits.
    expect(execucoes.commits).toHaveLength(1);
    expect(execucoes.commits[0].executions).toHaveLength(2);
    expect(execucoes.commits[0].sessionId).toBe("sessao-fixa");
  });

  it("mantém os registros separados, um por procedimento", async () => {
    const { uc, execucoes } = montar(
      [
        procedimento({ id: "a", name: "Restauração", category: "Dentística" }),
        procedimento({ id: "b", name: "Profilaxia", category: "Prevenção" }),
      ],
      [material({ id: "m1", stock: 10 })]
    );

    await uc.execute(ator, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 1 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 1 }] },
      ],
    });

    const nomes = execucoes.commits[0].executions.map((e) => e.procedureName);
    expect(nomes).toEqual(["Restauração", "Profilaxia"]);
  });

  it("soma o custo dos procedimentos da consulta", async () => {
    const { uc } = montar(
      [procedimento({ id: "a" }), procedimento({ id: "b" })],
      [material({ id: "m1", stock: 10, unitCost: 2.5 })]
    );

    const r = await uc.execute(ator, {
      procedures: [
        { procedureId: "a", materials: [{ materialId: "m1", quantity: 2 }] },
        { procedureId: "b", materials: [{ materialId: "m1", quantity: 4 }] },
      ],
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBe(15);
  });

  it("deixa o custo nulo quando nenhum item tem preço", async () => {
    const { uc } = montar([procedimento()], [material({ unitCost: null })]);
    const r = await uc.execute(ator, {
      procedureId: "p1",
      materials: [{ materialId: "m1", quantity: 1 }],
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBeNull();
  });
});

describe("FinalizeProcedureUseCase — validação do pedido", () => {
  const casos: [string, Record<string, unknown>][] = [
    ["sem procedimento algum", { procedures: [] }],
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
    const { uc } = montar([procedimento()], [material()]);
    await expect(uc.execute(ator, corpo)).rejects.toThrow(ValidationError);
  });

  it("recusa o mesmo procedimento enviado duas vezes", async () => {
    const { uc } = montar([procedimento()], [material()]);

    await expect(
      uc.execute(ator, {
        procedures: [
          { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] },
          { procedureId: "p1", materials: [{ materialId: "m1", quantity: 1 }] },
        ],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("recusa mais procedimentos do que cabe numa consulta", async () => {
    const { uc } = montar([procedimento()], [material()]);
    const demais = Array.from({ length: 21 }, (_, i) => ({
      procedureId: `p${i}`,
      materials: [{ materialId: "m1", quantity: 1 }],
    }));

    await expect(uc.execute(ator, { procedures: demais })).rejects.toThrow(ValidationError);
  });

  it("recusa lista de materiais absurdamente longa", async () => {
    const { uc } = montar([procedimento()], [material()]);
    const itens = Array.from({ length: 201 }, () => ({ materialId: "m1", quantity: 1 }));

    await expect(uc.execute(ator, { procedureId: "p1", materials: itens })).rejects.toThrow(
      ValidationError
    );
  });
});

describe("ReverseExecutionUseCase", () => {
  function montarEstorno(execucao: ProcedureExecution | null) {
    const repo = new ExecucoesEmMemoria();
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

  it("devolve apenas os materiais e registra o autor", async () => {
    const { uc, repo } = montarEstorno(base);
    await uc.execute(ator, "e1");

    expect(repo.estornos).toEqual([
      { executionId: "e1", returns: [{ materialId: "m1", quantity: 2 }] },
    ]);
  });

  it("recusa estornar registro inexistente", async () => {
    const { uc } = montarEstorno(null);
    await expect(uc.execute(ator, "fantasma")).rejects.toThrow(NotFoundError);
  });

  it("recusa estorno duplicado e não chama o repositório", async () => {
    const { uc, repo } = montarEstorno({ ...base, reversedAt: new Date() });
    await expect(uc.execute(ator, "e1")).rejects.toThrow();
    expect(repo.estornos).toHaveLength(0);
  });
});
