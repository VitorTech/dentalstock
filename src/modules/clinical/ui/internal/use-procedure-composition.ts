"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { catalogKeys } from "@/modules/catalog/ui/queries";
import { summarizeCost } from "@/modules/clinical/domain";

/**
 * A procedure's materials and instruments, with optimistic edits.
 *
 * It takes all the API conversation out of the card: the component only
 * decides what to show, and the rules of "confirm before removing" and
 * "update before saving" live in one place.
 *
 * The list is kept in local state rather than read from the cache: a quantity
 * stepper has to answer on the keystroke, and waiting for a round trip to
 * redraw the number is what makes a form feel broken. The cache is told after
 * the fact, so every other screen sees the new composition.
 */
export function useProcedureComposition(procedure: Procedure) {
  const confirm = useConfirm();
  const client = useQueryClient();
  const refreshProcedures = () =>
    client.invalidateQueries({ queryKey: catalogKeys.allProcedures });
  const [materials, setMaterials] = useState(procedure.materials);
  const [instruments, setInstruments] = useState(procedure.instruments);

  // The parent list may swap the procedure (search, duplication): local state
  // follows the new source.
  useEffect(() => setMaterials(procedure.materials), [procedure.materials]);
  useEffect(() => setInstruments(procedure.instruments), [procedure.instruments]);

  /**
   * Estimated cost of the current list, using the same policy as finalization.
   *
   * `missing` counts materials without a price: showing "R$ 12,00" when half
   * the items have no cost registered would imply a precision the number does
   * not have, so the screen says the total is partial.
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
    refreshProcedures();
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
    refreshProcedures();
  };

  /** Returns `true` when the link was created — the caller closes the modal. */
  const addMaterial = async (materialId: string, quantity: number): Promise<boolean> => {
    try {
      const created = await addProcedureMaterial(procedure.id, materialId, quantity);
      setMaterials((prev) => [...prev, created]);
      refreshProcedures();
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
    refreshProcedures();
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
    refreshProcedures();
  };

  const addInstrument = async (instrumentId: string, quantity: number): Promise<boolean> => {
    try {
      const created = await addProcedureInstrument(procedure.id, instrumentId, quantity);
      setInstruments((prev) => [...prev, created]);
      refreshProcedures();
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
