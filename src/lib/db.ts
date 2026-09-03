import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma Client — mencegah koneksi berlebih saat hot-reload dev.
 * Dibuat pada modul server (jangan pernah di-import dari Client Component).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
