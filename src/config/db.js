// ============================================================
// src/config/db.js
// Prisma Client Singleton
// Prevents multiple instances in development (hot-reload safe)
// ============================================================

const { PrismaClient } = require("@prisma/client");
const env = require("./env");

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ["query", "error", "warn"] : ["error"],
  });

if (env.isDev) {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
