/**
 * The process-wide PostgreSQL client.
 *
 * A single instance reused in development: without it every Next recompile
 * would open a new pool and the database would run out of connections.
 *
 * Only persistence adapters and the composition root import this module. No
 * use case knows about it — whoever needs data talks to a repository port.
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
