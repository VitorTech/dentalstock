"use client";

/**
 * Inventory cache: the stock ledger and the writes that move a balance.
 *
 * The ledger is paginated with `useInfiniteQuery`: "load more" is exactly the
 * shape it models, and keeping the loaded pages in cache is what lets the
 * screen return from a material's detail without losing the scroll position.
 *
 * Every write here changes a material's balance, so all of them invalidate the
 * catalog keys as well — the same number is shown on three different screens.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogKeys } from "@/modules/catalog/ui/queries";
import type { StockMovementType } from "@/modules/inventory/domain";
import { adjustStock, listMovements, registerEntry } from "./api";

export interface MovementFilters {
  days: number;
  type: StockMovementType | "";
  materialId: string | null;
}

export const inventoryKeys = {
  movements: (filters: MovementFilters) =>
    ["inventory", "movements", filters.days, filters.type, filters.materialId] as const,
  allMovements: ["inventory", "movements"] as const,
};

export function useMovements(filters: MovementFilters) {
  return useInfiniteQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: ({ pageParam }) => listMovements({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined),
  });
}

/** Keys that stop reflecting reality once a balance moves. */
function invalidateStockViews(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: inventoryKeys.allMovements });
  client.invalidateQueries({ queryKey: catalogKeys.materials });
  client.invalidateQueries({ queryKey: catalogKeys.allProcedures });
  client.invalidateQueries({ queryKey: ["analytics"] });
}

export function useRegisterEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: registerEntry,
    onSuccess: () => invalidateStockViews(client),
  });
}

export function useAdjustStock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: () => invalidateStockViews(client),
  });
}
