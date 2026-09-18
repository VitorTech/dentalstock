"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import { useConfirm } from "@/shared/ui/ConfirmProvider";
import ErrorBanner from "@/shared/ui/ErrorBanner";
import { ApiError } from "@/shared/ui/api-client";
import {
  useChangeMemberRole,
  useMe,
  useRemoveMember,
  useResetMemberPassword,
  useTeam,
} from "@/modules/identity/ui/queries";
import type { UserRole } from "@/shared/domain";
import InviteForm from "@/modules/identity/ui/InviteForm";
import { ROLE_HINT, ROLE_LABEL, type TeamUser } from "@/modules/identity/ui/team";


export default function EquipePage() {
  const { me, canManage, loading: loadingMe } = useMe();
  const confirm = useConfirm();
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading: loading } = useTeam();

  /**
   * Every write refreshes the list through its own mutation instead of
   * patching the array here. Role changes end the member's open sessions on
   * the server, so a stale local copy would be a lie about who can do what.
   */
  const roleChange = useChangeMemberRole();
  const passwordReset = useResetMemberPassword();
  const removal = useRemoveMember();

  const run = async (action: Promise<unknown>, fallback: string) => {
    setError(null);
    try {
      await action;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : fallback);
    }
  };

  const changeRole = async (user: TeamUser, role: UserRole) => {
    const ok = await confirm({
      title: `Alterar o papel de ${user.name}?`,
      message: `${ROLE_HINT[role] ?? ""} As sessões abertas deste usuário serão encerradas.`,
      confirmLabel: "Alterar",
    });
    if (!ok) return;
    run(roleChange.mutateAsync({ userId: user.id, role }), "Não foi possível alterar o papel.");
  };

  const resetPassword = async (user: TeamUser) => {
    const password = window.prompt(`Nova senha para ${user.name} (mínimo 8 caracteres):`);
    if (!password) return;
    run(
      passwordReset.mutateAsync({ userId: user.id, password }),
      "Não foi possível redefinir a senha."
    );
  };

  const remove = async (user: TeamUser) => {
    const ok = await confirm({
      title: `Remover o acesso de ${user.name}?`,
      message: "O histórico das operações feitas por esta pessoa é preservado.",
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (!ok) return;
    run(removal.mutateAsync(user.id), "Não foi possível remover o acesso.");
  };

  if (!loadingMe && !canManage) {
    return (
      <main className="bg-canvas">
        <SiteHeader />
        <section className="mx-auto max-w-3xl px-5 pb-24 pt-20 text-center">
          <ShieldCheck size={28} className="mx-auto mb-3 text-subink" />
          <h1 className="text-[20px] font-semibold text-ink">Acesso restrito</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-subink">
            Somente quem tem acesso completo pode gerenciar a equipe da clínica.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <Users size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Equipe
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Dê acesso à sua equipe. O perfil de auxiliar trabalha no estoque sem enxergar custos.
          </p>
        </div>

        <ErrorBanner message={error} />

        <div className="mb-6">
          {inviting ? (
            <InviteForm
              onCancel={() => setInviting(false)}
              onCreated={() => setInviting(false)}
            />
          ) : (
            <button
              onClick={() => setInviting(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <UserPlus size={15} /> Adicionar acesso
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-xl2 border border-hairline bg-surface/60"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-hairline/60 rounded-xl2 border border-hairline bg-surface shadow-card">
            {users.map((user) => {
              const isSelf = user.email === me?.user.email;
              const isPlatform = user.role === "OWNER";
              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
                      {user.name}
                      {isSelf && (
                        <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-subink">
                          você
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[12.5px] text-subink">{user.email}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isPlatform || isSelf ? (
                      <span className="rounded-full bg-canvas px-3 py-1.5 text-[12.5px] font-medium text-subink">
                        {ROLE_LABEL[user.role]}
                      </span>
                    ) : (
                      <>
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user, e.target.value as UserRole)}
                          className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent"
                        >
                          <option value="MEMBER">Acesso completo</option>
                          <option value="ASSISTANT">Auxiliar</option>
                        </select>

                        <button
                          onClick={() => resetPassword(user)}
                          title="Redefinir senha"
                          aria-label={`Redefinir senha de ${user.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-subink transition-colors hover:bg-canvas hover:text-ink"
                        >
                          <KeyRound size={13} />
                        </button>

                        <button
                          onClick={() => remove(user)}
                          title="Remover acesso"
                          aria-label={`Remover acesso de ${user.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-subink transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-xl2 border border-hairline bg-surface/60 px-5 py-4">
          <p className="mb-2 text-[12.5px] font-medium uppercase tracking-wide text-subink">
            O que cada papel pode fazer
          </p>
          <dl className="flex flex-col gap-2 text-[13px]">
            <div>
              <dt className="font-medium text-ink">Acesso completo</dt>
              <dd className="text-subink">{ROLE_HINT.MEMBER}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Auxiliar</dt>
              <dd className="text-subink">{ROLE_HINT.ASSISTANT}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
