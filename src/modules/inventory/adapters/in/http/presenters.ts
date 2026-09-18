/**
 * Inventory HTTP contract.
 *
 * Stripping cost from whoever may not see it happens here, not on the screen
 * nor scattered across routes: the DTO is the boundary. Hiding a value in the
 * interface protects nothing if it still travels in the response.
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
