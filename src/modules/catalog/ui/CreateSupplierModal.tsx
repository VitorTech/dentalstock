"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import type { Supplier } from "@/modules/catalog/domain";
import { ApiError } from "@/shared/ui/api-client";
import { createSupplier } from "./api";

/** Modal de cadastro de fornecedor. */
export default function CreateSupplierModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent";

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSubmitting(true);
    try {
      onCreated(await createSupplier({ name, phone, email, notes }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível cadastrar o fornecedor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl3 bg-surface p-6 shadow-pop animate-fadeIn"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-ink">Novo fornecedor</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">Nome do fornecedor</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dental Cremer" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">Telefone (opcional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">E-mail (opcional)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@fornecedor.com" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">Observações (opcional)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: prazo de entrega, condições" className={inputClass} />
          </label>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-full px-3.5 py-2.5 text-[13.5px] font-medium text-subink transition-colors hover:bg-canvas"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-hairline disabled:text-subink"
            >
              {submitting && <Spinner size={14} />}
              {submitting ? "Salvando…" : "Cadastrar fornecedor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
