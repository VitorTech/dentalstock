/**
 * Tipos transversais do núcleo compartilhado.
 *
 * `AuthenticatedActor` mora aqui, e não no módulo de identidade, porque é o
 * "quem está chamando" que atravessa todos os casos de uso — inclusive os de
 * conta, que ficam abaixo da identidade na ordem dos módulos.
 */

/**
 * Modelo de domínio.
 *
 * São tipos de negócio, não linhas de tabela: nenhum decorator de ORM, nenhum
 * import de Prisma. Os adaptadores de persistência mapeiam entre estes tipos e
 * o banco, o que permite trocar o ORM sem tocar em regra de negócio.
 */

export type Uuid = string;

/**
 * Papéis.
 *
 * `OWNER` é o administrador da PLATAFORMA — quem opera o console de clínicas.
 * Dentro de uma clínica os papéis são `MEMBER` (acesso pleno) e `ASSISTANT`
 * (auxiliar/ASB: executa procedimento e repõe estoque, mas não altera o
 * catálogo nem enxerga custo).
 */
export type UserRole = "OWNER" | "MEMBER" | "ASSISTANT";

/** Identidade autenticada que atravessa os casos de uso. */
export interface AuthenticatedActor {
  userId: Uuid;
  tenantId: Uuid;
  role: UserRole;
  email: string;
  /** Assinatura das operações que registram autoria (baixa, ajuste, estorno). */
  name: string;
}
