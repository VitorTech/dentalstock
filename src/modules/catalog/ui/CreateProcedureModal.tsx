"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import type { Procedure } from "@/modules/catalog/domain";
import { ApiError } from "@/shared/ui/api-client";
import { createProcedure } from "./api";

export default function CreateProcedureModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: string[];
  onClose: () => void;
  onCreated: (procedure: Procedure) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Nome do procedimento é obrigatório.");
      return;
    }
    setSubmitting(true);
    try {
      onCreated(
        await createProcedure({
          name: name.trim(),
          category: category.trim() || null,
          description: description.trim() || null,
        })
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível criar o procedimento.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent";

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
          <h3 className="text-[17px] font-semibold text-ink">Novo procedimento</h3>
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
            <span className="text-[12.5px] font-medium text-subink">Nome do procedimento</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Restauração em Resina"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">Especialidade</span>
            <input
              list="especialidades"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Dentística"
              className={inputClass}
            />
            <datalist id="especialidades">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <span className="text-[11.5px] text-subink">
              Deixe em branco para agrupar em &quot;Outros&quot;.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">Descrição (opcional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do procedimento…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </label>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <p className="rounded-lg bg-canvas px-3 py-2 text-[12px] text-subink">
            Após criar, o procedimento abre para você adicionar os materiais e instrumentais.
          </p>

          <div className="mt-1 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-full px-3.5 py-2.5 text-[13.5px] font-medium text-subink transition-colors hover:bg-canvas"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
            >
              {submitting && <Spinner size={14} />}
              {submitting ? "Criando…" : "Criar procedimento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
