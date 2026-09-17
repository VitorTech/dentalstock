"use client";

import { useEffect, useState } from "react";
import { getSession, type SessionView } from "./api";

/** Identidade da sessão, como a tela a enxerga. */
export type Me = SessionView;

/**
 * Cache de módulo da identidade da sessão.
 *
 * Existe por um motivo medido: o hook é consumido pelo cabeçalho, pela página E
 * por cada card de procedimento. Sem cache, abrir uma especialidade com 12
 * procedimentos disparava 14 chamadas idênticas a /api/auth/me — e cada uma
 * custa três consultas ao banco (sessão, clínica e usuário).
 *
 * `emVoo` é o que resolve o caso real: os componentes montam no mesmo tick, de
 * modo que um cache preenchido só ao fim da primeira resposta chegaria tarde
 * demais. Compartilhando a promessa, as montagens simultâneas aguardam a MESMA
 * requisição.
 *
 * O escopo é a carga da página. Sair da conta faz navegação dura
 * (`window.location`), que recria o módulo — não há risco de identidade velha
 * sobreviver a uma troca de usuário.
 */
let cache: Me | null = null;
let emVoo: Promise<Me | null> | null = null;
const inscritos = new Set<(me: Me | null) => void>();

async function carregar(): Promise<Me | null> {
  if (cache) return cache;

  emVoo ??= getSession().then((data) => {
    // Falha não é memorizada: o próximo componente a montar tenta de novo,
    // em vez de a tela ficar presa num erro momentâneo de rede.
    if (data) cache = data;
    emVoo = null;
    inscritos.forEach((notificar) => notificar(data));
    return data;
  });

  return emVoo;
}

/** Descarta a identidade memorizada (troca de clínica, mudança de papel). */
export function invalidateMe() {
  cache = null;
  emVoo = null;
}

/**
 * Identidade da sessão atual, para a interface se adaptar ao papel.
 *
 * Importante: isto é CONVENIÊNCIA VISUAL, não segurança. Esconder um botão não
 * protege nada — quem decide é o guarda da rota, no servidor. A tela usa isto
 * apenas para não oferecer uma ação que resultaria em 403.
 */
export function useMe() {
  const [me, setMe] = useState<Me | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let ativo = true;
    const receber = (valor: Me | null) => {
      if (ativo) setMe(valor);
    };
    inscritos.add(receber);

    carregar().then((valor) => {
      if (!ativo) return;
      setMe(valor);
      setLoading(false);
    });

    return () => {
      ativo = false;
      inscritos.delete(receber);
    };
  }, []);

  const role = me?.user.role;

  return {
    me,
    loading,
    /** Pode alterar o cadastro da clínica (materiais, procedimentos, kits). */
    canManage: role === "OWNER" || role === "MEMBER",
    /** Pode ver valores. */
    canSeeCosts: role === "OWNER" || role === "MEMBER",
  };
}
