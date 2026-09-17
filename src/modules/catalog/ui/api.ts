"use client";

/**
 * Operações de catálogo disponíveis às telas.
 *
 * Toda URL de `/api/...` do catálogo mora aqui — nenhuma tela monta caminho
 * nem corpo de requisição à mão. Ganho concreto: renomear um endpoint é uma
 * edição neste arquivo, e não uma caçada por `fetch(` pelo projeto inteiro.
 *
 * Leituras usam `apiGet` (degradam para lista vazia); escritas usam `apiSend`
 * (lançam `ApiError` com a mensagem do servidor).
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

// ── Materiais ──────────────────────────────────────────────────────────────

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

/** Campos editáveis de um material já cadastrado. */
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

// ── Instrumentais ──────────────────────────────────────────────────────────

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

// ── Fornecedores ───────────────────────────────────────────────────────────

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

// ── Procedimentos ──────────────────────────────────────────────────────────

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

// ── Composição do procedimento ─────────────────────────────────────────────

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
