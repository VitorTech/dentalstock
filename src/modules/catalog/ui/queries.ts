"use client";

/**
 * Catalog cache: query keys, reads and mutations.
 *
 * The split from `api.ts` is deliberate. `api.ts` says WHAT the endpoint is
 * and what it returns; this file says WHEN the screen may reuse an answer and
 * WHAT becomes stale after a write. Keeping them apart means a screen can call
 * the API directly when it truly needs to (a one-off action), without the
 * cache rules getting in the way.
 *
 * Every mutation invalidates by key instead of patching lists by hand: hand
 * patching is where "the material was created but the list still shows the old
 * one" comes from.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Instrument, Material, Procedure, Supplier } from "@/modules/catalog/domain";
import {
  createInstrument,
  createMaterial,
  createProcedure,
  createSupplier,
  deleteProcedure,
  deleteSupplier,
  duplicateProcedure,
  listInstruments,
  listMaterials,
  listProcedures,
  listSuppliers,
  updateInstrument,
  updateMaterial,
  updateSupplier,
  type InstrumentInput,
  type MaterialInput,
  type MaterialPatch,
  type ProcedureInput,
  type SupplierInput,
} from "./api";

export const catalogKeys = {
  materials: ["catalog", "materials"] as const,
  instruments: ["catalog", "instruments"] as const,
  suppliers: ["catalog", "suppliers"] as const,
  procedures: (query = "") => ["catalog", "procedures", query] as const,
  allProcedures: ["catalog", "procedures"] as const,
};

// ── Reads ──────────────────────────────────────────────────────────────────

/**
 * Background polling is opt-in per screen.
 *
 * `refetchIntervalInBackground: false` is the point: the timer pauses while
 * the tab is hidden. A front desk leaves a screen open all day, and a naive
 * interval produced hundreds of requests an hour with nobody looking.
 */
interface PollingOptions {
  refetchIntervalMs?: number;
}

const polling = ({ refetchIntervalMs }: PollingOptions = {}) => ({
  refetchInterval: refetchIntervalMs,
  refetchIntervalInBackground: false,
});

export const useMaterials = (options?: PollingOptions) =>
  useQuery({ queryKey: catalogKeys.materials, queryFn: listMaterials, ...polling(options) });

export const useInstruments = (options?: PollingOptions) =>
  useQuery({ queryKey: catalogKeys.instruments, queryFn: listInstruments, ...polling(options) });

export const useSuppliers = () =>
  useQuery({ queryKey: catalogKeys.suppliers, queryFn: listSuppliers });

/**
 * Procedures, optionally filtered by the search box.
 *
 * `placeholderData` keeps the previous list on screen while a new search runs:
 * without it every keystroke blanks the page, which reads as flicker.
 */
export const useProcedures = (query = "") =>
  useQuery({
    queryKey: catalogKeys.procedures(query),
    queryFn: () => listProcedures(query),
    placeholderData: (previous) => previous,
  });

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateMaterial(onCreated?: (material: Material) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MaterialInput) => createMaterial(input),
    onSuccess: (material) => {
      client.invalidateQueries({ queryKey: catalogKeys.materials });
      onCreated?.(material);
    },
  });
}

export function useUpdateMaterial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MaterialPatch }) =>
      updateMaterial(id, patch),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: catalogKeys.materials });
      // A material's balance and price also show inside procedure cards.
      client.invalidateQueries({ queryKey: catalogKeys.allProcedures });
    },
  });
}

export function useCreateInstrument(onCreated?: (instrument: Instrument) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: InstrumentInput) => createInstrument(input),
    onSuccess: (instrument) => {
      client.invalidateQueries({ queryKey: catalogKeys.instruments });
      onCreated?.(instrument);
    },
  });
}

export function useUpdateInstrumentStock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      updateInstrument(id, { stock }),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.instruments }),
  });
}

export function useCreateSupplier(onCreated?: (supplier: Supplier) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => createSupplier(input),
    onSuccess: (supplier) => {
      client.invalidateQueries({ queryKey: catalogKeys.suppliers });
      onCreated?.(supplier);
    },
  });
}

export function useUpdateSupplier() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SupplierInput> }) =>
      updateSupplier(id, patch),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.suppliers }),
  });
}

export function useDeleteSupplier() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: catalogKeys.suppliers });
      // Linked materials lost their supplier (SetNull in the schema).
      client.invalidateQueries({ queryKey: catalogKeys.materials });
    },
  });
}

export function useCreateProcedure(onCreated?: (procedure: Procedure) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProcedureInput) => createProcedure(input),
    onSuccess: (procedure) => {
      client.invalidateQueries({ queryKey: catalogKeys.allProcedures });
      onCreated?.(procedure);
    },
  });
}

export function useDeleteProcedure() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProcedure(id),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.allProcedures }),
  });
}

export function useDuplicateProcedure(onDuplicated?: (procedure: Procedure) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateProcedure(id),
    onSuccess: (procedure) => {
      client.invalidateQueries({ queryKey: catalogKeys.allProcedures });
      onDuplicated?.(procedure);
    },
  });
}
