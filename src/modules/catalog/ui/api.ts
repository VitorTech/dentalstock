"use client";

/**
 * Catalog operations available to the screens.
 *
 * Every `/api/...` URL of the catalog lives here — no screen builds a path or
 * a request body by hand. Concrete gain: renaming an endpoint is one edit in
 * this file, not a hunt for `fetch(` across the project.
 *
 * Reads use `apiGet` (degrading to an empty list); writes use `apiSend`
 * (throwing `ApiError` with the server message).
 */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type {
  Instrument,
  Material,
  Procedure,
  ProcedureInstrument,
  ProcedureMaterial,
  Supplier,
} from "@/modules/catalog/domain";

// ── Materials ──────────────────────────────────────────────────────────────

export interface MaterialInput {
  name: string;
  unit: string;
  category?: string | null;
  imageUrl?: string | null;
  stock?: number;
  minStock?: number;
  supplierId?: string | null;
  unitCost?: number | null;
  expiresAt?: string | null;
}

/** Editable fields of an already registered material. */
export interface MaterialPatch {
  minStock?: number;
  supplierId?: string | null;
  unitCost?: number | null;
  expiresAt?: string | null;
}

export const listMaterials = () => apiGet<Material[]>("/api/materials", []);

export const createMaterial = (input: MaterialInput) =>
  apiSend<Material>("/api/materials", "POST", input);

export const updateMaterial = (id: string, patch: MaterialPatch) =>
  apiSend<Material>(`/api/materials/${id}`, "PATCH", patch);

// ── Instruments ────────────────────────────────────────────────────────────

export interface InstrumentInput {
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  stock?: number;
}

export const listInstruments = () => apiGet<Instrument[]>("/api/instruments", []);

export const createInstrument = (input: InstrumentInput) =>
  apiSend<Instrument>("/api/instruments", "POST", input);

export const updateInstrument = (id: string, patch: { stock?: number }) =>
  apiSend<Instrument>(`/api/instruments/${id}`, "PATCH", patch);

// ── Suppliers ──────────────────────────────────────────────────────────────

export interface SupplierInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export const listSuppliers = () => apiGet<Supplier[]>("/api/suppliers", []);

export const createSupplier = (input: SupplierInput) =>
  apiSend<Supplier>("/api/suppliers", "POST", input);

export const updateSupplier = (id: string, patch: Partial<SupplierInput>) =>
  apiSend<Supplier>(`/api/suppliers/${id}`, "PATCH", patch);

export const deleteSupplier = (id: string) => apiSend(`/api/suppliers/${id}`, "DELETE");

// ── Procedures ─────────────────────────────────────────────────────────────

export interface ProcedureInput {
  name: string;
  category?: string | null;
  description?: string | null;
}

export const listProcedures = (query = "") =>
  apiGet<Procedure[]>(
    query ? `/api/procedures?q=${encodeURIComponent(query)}` : "/api/procedures",
    []
  );

export const createProcedure = (input: ProcedureInput) =>
  apiSend<Procedure>("/api/procedures", "POST", input);

export const deleteProcedure = (id: string) => apiSend(`/api/procedures/${id}`, "DELETE");

export const duplicateProcedure = (id: string) =>
  apiSend<Procedure>(`/api/procedures/${id}/duplicate`, "POST", {});

// ── Procedure composition ──────────────────────────────────────────────────

export const addProcedureMaterial = (procedureId: string, materialId: string, quantity: number) =>
  apiSend<ProcedureMaterial>(`/api/procedures/${procedureId}/materials`, "POST", {
    materialId,
    quantity,
  });

export const updateProcedureMaterial = (linkId: string, quantity: number) =>
  apiSend(`/api/procedure-materials/${linkId}`, "PATCH", { quantity });

export const removeProcedureMaterial = (linkId: string) =>
  apiSend(`/api/procedure-materials/${linkId}`, "DELETE");

export const addProcedureInstrument = (
  procedureId: string,
  instrumentId: string,
  quantity: number
) =>
  apiSend<ProcedureInstrument>(`/api/procedures/${procedureId}/instruments`, "POST", {
    instrumentId,
    quantity,
  });

export const updateProcedureInstrument = (linkId: string, quantity: number) =>
  apiSend(`/api/procedure-instruments/${linkId}`, "PATCH", { quantity });

export const removeProcedureInstrument = (linkId: string) =>
  apiSend(`/api/procedure-instruments/${linkId}`, "DELETE");
