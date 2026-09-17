"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/shared/ui/ConfirmProvider";
import type { Procedure } from "@/modules/catalog/domain";
import {
  addProcedureInstrument,
  addProcedureMaterial,
  removeProcedureInstrument,
  removeProcedureMaterial,
  updateProcedureInstrument,
  updateProcedureMaterial,
} from "@/modules/catalog/ui/api";
import { summarizeCost } from "@/modules/clinical/domain";

/**
 * Materiais e instrumentais de um procedimento, com as edições otimistas.
 *
 * Tira do card toda a conversa com a API: o componente só decide o que exibir,
 * e as regras de "confirmar antes de remover" e "atualizar antes de salvar"
 * ficam num lugar só.
 */
export function useProcedureComposition(procedure: Procedure) {
  const confirm = useConfirm();
  const [materials, setMaterials] = useState(procedure.materials);
  const [instruments, setInstruments] = useState(procedure.instruments);

  // A lista pai pode trocar o procedimento (busca, duplicação): o estado local
  // acompanha a nova fonte.
  useEffect(() => setMaterials(procedure.materials), [procedure.materials]);
  useEffect(() => setInstruments(procedure.instruments), [procedure.instruments]);

  /**
   * Custo estimado da lista atual, pela mesma política usada na finalização.
   *
   * `missing` conta os materiais sem preço: mostrar "R$ 12,00" quando metade
   * dos itens não tem custo cadastrado passaria uma precisão que o número não
   * tem, então a tela avisa que o total é parcial.
   */
  const cost = useMemo(() => {
    const summary = summarizeCost(
      materials.map((pm) => ({
        kind: "MATERIAL" as const,
        quantity: pm.quantity,
        unitCost: pm.material.unitCost,
      }))
    );
    return { total: summary.total, missing: summary.missing, known: summary.counted - summary.missing };
  }, [materials]);

  const changeMaterialQuantity = async (procedureMaterialId: string, quantity: number) => {
    setMaterials((prev) =>
      prev.map((pm) => (pm.id === procedureMaterialId ? { ...pm, quantity } : pm))
    );
    await updateProcedureMaterial(procedureMaterialId, quantity);
  };

  const removeMaterial = async (procedureMaterialId: string) => {
    const pm = materials.find((m) => m.id === procedureMaterialId);
    const ok = await confirm({
      title: "Remover material do procedimento?",
      message: pm
        ? `"${pm.material.name}" será removido deste procedimento. O material continua cadastrado no estoque.`
        : undefined,
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (!ok) return;
    setMaterials((prev) => prev.filter((m) => m.id !== procedureMaterialId));
    await removeProcedureMaterial(procedureMaterialId);
  };

  /** Devolve `true` quando o vínculo foi criado — o chamador fecha o modal. */
  const addMaterial = async (materialId: string, quantity: number): Promise<boolean> => {
    try {
      const created = await addProcedureMaterial(procedure.id, materialId, quantity);
      setMaterials((prev) => [...prev, created]);
      return true;
    } catch {
      return false;
    }
  };

  const changeInstrumentQuantity = async (procedureInstrumentId: string, quantity: number) => {
    setInstruments((prev) =>
      prev.map((pi) => (pi.id === procedureInstrumentId ? { ...pi, quantity } : pi))
    );
    await updateProcedureInstrument(procedureInstrumentId, quantity);
  };

  const removeInstrument = async (procedureInstrumentId: string) => {
    const pi = instruments.find((i) => i.id === procedureInstrumentId);
    const ok = await confirm({
      title: "Remover instrumental do procedimento?",
      message: pi
        ? `"${pi.instrument.name}" será removido deste procedimento. O instrumental continua cadastrado no estoque.`
        : undefined,
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (!ok) return;
    setInstruments((prev) => prev.filter((i) => i.id !== procedureInstrumentId));
    await removeProcedureInstrument(procedureInstrumentId);
  };

  const addInstrument = async (instrumentId: string, quantity: number): Promise<boolean> => {
    try {
      const created = await addProcedureInstrument(procedure.id, instrumentId, quantity);
      setInstruments((prev) => [...prev, created]);
      return true;
    } catch {
      return false;
    }
  };

  return {
    materials,
    setMaterials,
    instruments,
    cost,
    changeMaterialQuantity,
    removeMaterial,
    addMaterial,
    changeInstrumentQuantity,
    removeInstrument,
    addInstrument,
  };
}
