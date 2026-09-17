/**
 * Cliente PostgreSQL do processo.
 *
 * Instância única reaproveitada em desenvolvimento: sem isso, cada recompilação
 * do Next abriria um novo pool e o banco esgotaria as conexões.
 *
 * Só os adaptadores de persistência e a raiz de composição importam este
 * módulo. Nenhum caso de uso o conhece — quem precisa de dados fala com as
 * portas de repositório.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
