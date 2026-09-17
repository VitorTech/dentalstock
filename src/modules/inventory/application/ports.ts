/**
 * Portas do estoque.
 *
 * `StockMovementRepository.register` existe como operação única — e não como
 * "atualiza saldo" e "grava movimento" separados — porque saldo e explicação
 * precisam mudar juntos.
 */
import type { Material } from "@/modules/catalog/domain";
import type { StockMovement, StockMovementType } from "@/modules/inventory/domain";
import type { Uuid } from "@/shared/domain";

/**
 * Livro-razão do estoque.
 *
 * `register` existe como porta própria — em vez de "atualiza estoque" e "grava
 * movimento" separados — porque saldo e explicação precisam mudar juntos. Um
 * estoque alterado sem movimento correspondente é exatamente o registro que
 * ninguém consegue auditar depois.
 */
export interface StockMovementRepository {
  register(input: {
    tenantId: Uuid;
    materialId: Uuid;
    /** Assinado: negativo sai, positivo entra. */
    quantity: number;
    type: StockMovementType;
    note: string | null;
    unitCost: number | null;
    /** Novo custo do material, já calculado pela política. */
    newMaterialCost?: number | null;
    userId: Uuid | null;
    userName: string | null;
  }): Promise<Material>;

  listByTenant(input: {
    tenantId: Uuid;
    materialId?: Uuid;
    type?: StockMovementType;
    sinceDays?: number;
    page: number;
    pageSize: number;
  }): Promise<{ items: StockMovement[]; total: number }>;
}

/**
 * Relatórios de consumo real (movimentos de consumo não estornados).
 *
 * Porta do estoque, e não do painel: a lista de compras depende dela, e o
 * painel apenas a compõe.
 */
export interface ConsumptionReport {
  consumptionByMaterial(tenantId: Uuid): Promise<{ materialId: Uuid; total: number }[]>;
  /** Consumo por material dentro de uma janela — base da sugestão de compra. */
  consumptionByMaterialSince(
    tenantId: Uuid,
    days: number
  ): Promise<{ materialId: Uuid; total: number }[]>;
  consumptionBySpecialty(tenantId: Uuid): Promise<{ name: string; total: number }[]>;
  consumptionByDay(tenantId: Uuid, days: number): Promise<{ date: string; total: number }[]>;
}
