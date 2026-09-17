"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout as logoutRequest } from "./api";

/**
 * Encerra a sessão e devolve o usuário ao login.
 *
 * Vive em um hook, e não dentro de um menu, porque encerrar sessão precisa
 * estar disponível em telas que não têm o menu do app — em especial a de
 * assinatura, que é para onde o usuário bloqueado é levado. Sem uma saída ali,
 * ele fica preso: o middleware enxerga o cookie e devolve quem tenta ir ao
 * /login para dentro do app, que bloqueia de novo.
 *
 * A ordem importa: só navegamos depois que a rota de logout respondeu, porque
 * é ela que apaga o cookie. Navegar antes recriaria o mesmo laço.
 */
export function useLogout() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    try {
      await logoutRequest();
    } catch {
      // Falha de rede não pode prender o usuário: seguimos para o login de
      // qualquer forma. A sessão continua válida no servidor, mas ele deixa de
      // ficar sem saída — e a rota de logout é idempotente na próxima tentativa.
    }
    router.replace("/login");
    router.refresh();
  };

  return { logout, leaving };
}
