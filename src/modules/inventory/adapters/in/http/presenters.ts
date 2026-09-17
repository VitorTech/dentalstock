/**
 * Contrato HTTP do estoque.
 *
 * A remoção de custo para quem não pode vê-lo acontece aqui, e não na tela nem
 * espalhada pelas rotas: o DTO é a fronteira. Esconder um valor na interface
 * não protege nada se ele trafega na resposta.
 */
import { canSeeCosts } from "@/modules/identity/domain";
import type { StockMovement } from "@/modules/inventory/domain";
import type { AuthenticatedActor } from "@/shared/domain";

export function toMovementPageResponse(
  result: { items: StockMovement[]; total: number },
  paging: { page: number; pageSize: number },
  actor: AuthenticatedActor
) {
  const showCosts = canSeeCosts(actor.role);
  return {
    movements: result.items.map((m) => ({ ...m, unitCost: showCosts ? m.unitCost : null })),
    total: result.total,
    page: paging.page,
    pageSize: paging.pageSize,
    hasMore: paging.page * paging.pageSize < result.total,
  };
}
