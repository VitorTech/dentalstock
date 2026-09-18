/**
 * Catalog ports.
 *
 * Security convention: every method takes `tenantId` explicitly, and the
 * implementations must apply it — not merely accept it.
 */
import type { Instrument, Material, Procedure, Supplier } from "@/modules/catalog/domain";
import type { Uuid } from "@/shared/domain";

export interface MaterialUpdate {
  stock?: number;
  minStock?: number;
  supplierId?: Uuid | null;
  unitCost?: number | null;
  expiresAt?: Date | null;
}

export interface MaterialRepository {
  listByTenant(tenantId: Uuid): Promise<Material[]>;
  findById(tenantId: Uuid, id: Uuid): Promise<Material | null>;
  findManyByIds(tenantId: Uuid, ids: Uuid[]): Promise<Material[]>;
  create(data: Omit<Material, "id" | "supplier">): Promise<Material>;
  update(tenantId: Uuid, id: Uuid, data: MaterialUpdate): Promise<Material>;
}

export interface InstrumentRepository {
  listByTenant(tenantId: Uuid): Promise<Instrument[]>;
  findById(tenantId: Uuid, id: Uuid): Promise<Instrument | null>;
  create(data: Omit<Instrument, "id">): Promise<Instrument>;
  update(tenantId: Uuid, id: Uuid, data: { stock: number }): Promise<Instrument>;
}

export interface SupplierRepository {
  listByTenant(tenantId: Uuid): Promise<Supplier[]>;
  countByTenant(tenantId: Uuid): Promise<number>;
  findById(tenantId: Uuid, id: Uuid): Promise<Supplier | null>;
  create(data: Omit<Supplier, "id">): Promise<Supplier>;
  update(tenantId: Uuid, id: Uuid, data: Partial<Omit<Supplier, "id" | "tenantId">>): Promise<Supplier>;
  delete(tenantId: Uuid, id: Uuid): Promise<void>;
}

export interface ProcedureRepository {
  listByTenant(tenantId: Uuid, search?: string): Promise<Procedure[]>;
  findById(tenantId: Uuid, id: Uuid): Promise<Procedure | null>;
  create(data: {
    tenantId: Uuid;
    name: string;
    category: string | null;
    description: string | null;
  }): Promise<Procedure>;
  /** Clones the procedure with its whole item list, in one transaction. */
  duplicate(tenantId: Uuid, id: Uuid, newName: string): Promise<Procedure>;
  delete(tenantId: Uuid, id: Uuid): Promise<void>;
  addMaterial(tenantId: Uuid, procedureId: Uuid, materialId: Uuid, quantity: number): Promise<void>;
  addInstrument(tenantId: Uuid, procedureId: Uuid, instrumentId: Uuid, quantity: number): Promise<void>;
  updateMaterialQuantity(tenantId: Uuid, linkId: Uuid, quantity: number): Promise<void>;
  updateInstrumentQuantity(tenantId: Uuid, linkId: Uuid, quantity: number): Promise<void>;
  removeMaterial(tenantId: Uuid, linkId: Uuid): Promise<void>;
  removeInstrument(tenantId: Uuid, linkId: Uuid): Promise<void>;
}

