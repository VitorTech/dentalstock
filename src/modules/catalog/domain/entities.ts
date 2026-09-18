/**
 * Catalog: what the clinic owns and how each procedure is composed.
 *
 * Materials, instruments, suppliers and procedures. These are the reference
 * data that inventory and clinical work operate on.
 */
import type { Uuid } from "@/shared/domain";

export interface Supplier {
  id: Uuid;
  tenantId: Uuid;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface Material {
  id: Uuid;
  tenantId: Uuid;
  name: string;
  unit: string;
  category: string | null;
  imageUrl: string | null;
  stock: number;
  minStock: number;
  supplierId: Uuid | null;
  supplier?: Supplier | null;
  /** Cost of a single unit. `null` while the clinic has not entered a price. */
  unitCost: number | null;
  /** Expiry date of the current batch. */
  expiresAt: Date | null;
}

/**
 * An instrument is reusable: it has inventory, but is not consumed.
 *
 * It has no minimum stock, and that absence is intentional. A minimum exists
 * to trigger restocking of something that gets used up; an instrument returns
 * to the bench after the procedure, so the only useful information is how many
 * the clinic owns.
 */
export interface Instrument {
  id: Uuid;
  tenantId: Uuid;
  name: string;
  category: string | null;
  imageUrl: string | null;
  stock: number;
}

export interface ProcedureMaterial {
  id: Uuid;
  materialId: Uuid;
  quantity: number;
  material: Material;
}

export interface ProcedureInstrument {
  id: Uuid;
  instrumentId: Uuid;
  quantity: number;
  instrument: Instrument;
}

export interface Procedure {
  id: Uuid;
  tenantId: Uuid;
  name: string;
  category: string | null;
  description: string | null;
  materials: ProcedureMaterial[];
  instruments: ProcedureInstrument[];
}

