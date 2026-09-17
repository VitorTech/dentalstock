"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import type { UserRole } from "@/shared/domain";
import { ROLE_HINT, type TeamUser } from "./team";
import { ApiError } from "@/shared/ui/api-client";
import { inviteMember } from "./api";

/** Formulário de convite de um novo membro da equipe. */
export default function InviteForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (user: TeamUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ASSISTANT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      onCreated(
        await inviteMember({ name: name.trim(), email: email.trim(), password, role })
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível criar o acesso.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl2 border border-hairline bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold text-ink">Novo acesso</h3>
        <button
          onClick={onCancel}
          aria-label="Cancelar"
          className="flex h-7 w-7 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha (mínimo 8 caracteres)"
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent"
        >
          <option value="ASSISTANT">Auxiliar</option>
          <option value="MEMBER">Acesso completo</option>
        </select>
      </div>

      <p className="mt-2 text-[12px] leading-snug text-subink">{ROLE_HINT[role]}</p>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          <TriangleAlert size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={saving || email.trim() === "" || password.length < 8}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-hairline disabled:text-subink"
      >
        {saving && <Spinner size={15} />} Criar acesso
      </button>
    </div>
  );
}
