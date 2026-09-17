/**
 * Declaração de rotas de API.
 *
 * Toda rota passa por aqui, e isso garante duas coisas por construção:
 *
 *  - **O nível de acesso é obrigatório e explícito.** Não existe rota sem
 *    decisão de acesso: até as públicas declaram `"public"`. Antes, cada rota
 *    chamava o guarda por conta própria — esquecer a chamada abria a rota sem
 *    que nada acusasse.
 *
 *  - **O contrato do Next fica num lugar só.** A leitura de `params` e o
 *    tratamento de erro não se repetem nos handlers. Quando o projeto migrar
 *    para o Next 15, onde `params` passa a ser uma Promise, a mudança acontece
 *    neste arquivo — não em cada rota dinâmica.
 */
import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import type { AuthenticatedActor } from "@/shared/domain";
import { withErrorHandling } from "@/shared/infrastructure/http/errors";
import { requireAuthenticated, requireCatalogManager } from "../auth";

/**
 * - `public`: sem sessão (login, verificação de saúde).
 * - `authenticated`: sessão válida. Padrão das rotas de dados.
 * - `catalogManager`: além disso, pode alterar o cadastro da clínica.
 */
export type Access = "public" | "authenticated" | "catalogManager";

export interface RouteContext<A extends Access> {
  req: NextRequest;
  params: Record<string, string>;
  actor: A extends "public" ? null : AuthenticatedActor;
}

const GUARDS: Record<Access, () => Promise<AuthenticatedActor | null>> = {
  public: async () => null,
  authenticated: requireAuthenticated,
  catalogManager: requireCatalogManager,
};

export function route<A extends Access>(
  access: A,
  handler: (ctx: RouteContext<A>) => Promise<NextResponse>
) {
  return withErrorHandling(
    async (req: NextRequest, context: { params: Record<string, string> }) => {
      const actor = (await GUARDS[access]()) as RouteContext<A>["actor"];
      return handler({ req, params: context?.params ?? {}, actor });
    }
  );
}
