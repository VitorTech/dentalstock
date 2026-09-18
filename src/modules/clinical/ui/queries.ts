"use client";

/**
 * Clinical cache: appointment history and the reversal of a finalization.
 *
 * Finalization itself is NOT a `useMutation`: its 409 is an expected outcome
 * (the transaction was refused for lack of stock, and the answer lists what is
 * missing), so it is modelled as a result rather than an error. The finalize
 * hook keeps that shape and invalidates through `useFinalizationInvalidator`.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogKeys } from "@/modules/catalog/ui/queries";
import { inventoryKeys } from "@/modules/inventory/ui/queries";
import { listHistory, reverseExecution } from "./api";

export interface HistoryFilters {
  query: string;
  days: number;
}

export const clinicalKeys = {
  history: (filters: HistoryFilters) =>
    ["clinical", "history", filters.query, filters.days] as const,
  allHistory: ["clinical", "history"] as const,
};

export function useHistory(filters: HistoryFilters) {
  return useInfiniteQuery({
    queryKey: clinicalKeys.history(filters),
    queryFn: ({ pageParam }) => listHistory({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined),
  });
}

/**
 * What stops being true once stock moved through an appointment: the ledger,
 * the material balances, the procedure cards and the dashboard figures.
 */
export function useFinalizationInvalidator() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: clinicalKeys.allHistory });
    client.invalidateQueries({ queryKey: inventoryKeys.allMovements });
    client.invalidateQueries({ queryKey: catalogKeys.materials });
    client.invalidateQueries({ queryKey: catalogKeys.allProcedures });
    client.invalidateQueries({ queryKey: ["analytics"] });
  };
}

export function useReverseExecution() {
  const invalidate = useFinalizationInvalidator();
  return useMutation({
    mutationFn: (executionId: string) => reverseExecution(executionId),
    onSuccess: invalidate,
  });
}
