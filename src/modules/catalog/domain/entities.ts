/**
 * Catálogo: o que a clínica tem e como cada procedimento é montado.
 *
 * Materiais, instrumentais, fornecedores, procedimentos e kits. São os dados
 * de referência sobre os quais estoque e atendimento operam.
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
  /** Custo de uma unidade. `null` quando a clínica ainda não informou preço. */
  unitCost: number | null;
  /** Validade do lote corrente. */
  expiresAt: Date | null;
  /** Código de barras (EAN/UPC), para entrada e baixa pela câmera. */
}

/**
 * Instrumental é reutilizável: tem inventário, mas não é consumido.
 *
 * Não tem estoque mínimo, e a ausência é intencional. Estoque mínimo existe
 * para disparar reposição de algo que se gasta; instrumental volta para a
 * bancada depois do procedimento, então a única informação útil é quantos a
 * clínica possui.
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

