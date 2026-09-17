/**
 * Identidade da requisição atual, para rotas e Server Components.
 *
 * Reúne o que antes estava espalhado em três arquivos (`currentActor` no
 * container, os guardas em `http/guards.ts` e a sessão em `http/session.ts`).
 * Cada guarda lança erro de domínio, e a tradução para status HTTP fica com o
 * tratador de erros — ou com o layout, que redireciona.
 */
import "server-only";

import type { CurrentSession } from "@/modules/identity/application";
import type { AuthenticatedActor } from "@/shared/domain";
import { container } from "./container";

/**
 * Resolve quem está chamando a partir do cookie. Devolve null quando não há
 * sessão válida.
 */
export async function currentActor(): Promise<AuthenticatedActor | null> {
  const token = await container.identity.tokenTransport().read();
  return container.identity.authenticate.execute(token);
}

/** Guarda padrão das rotas de dados: exige sessão válida. */
export async function requireAuthenticated(): Promise<AuthenticatedActor> {
  return container.identity.authorization.requireActor(await currentActor());
}

/** Sessão válida + permissão de alterar o cadastro da clínica. */
export async function requireCatalogManager(): Promise<AuthenticatedActor> {
  return container.identity.authorization.requireCatalogManager(await currentActor());
}

/**
 * Sessão completa (ator, usuário e clínica) ou null.
 *
 * Trata igual sessão inválida e sessão órfã — usuário ou clínica excluídos:
 * nos dois casos não há contexto utilizável, e o layout manda para o login.
 */
export async function getSessionContext(): Promise<CurrentSession | null> {
  const actor = await currentActor();
  if (!actor) return null;
  return container.identity.getCurrentSession.execute(actor);
}
