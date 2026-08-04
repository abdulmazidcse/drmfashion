import { PrismaClient } from "@prisma/client"

// ─── Connection Pool Strategy ────────────────────────────────────────────────
//
//  PostgreSQL max_connections default = 100
//  Formula: connection_limit = (max_connections - 5_reserved) / num_app_instances
//
//  Single instance  → connection_limit=20  (set in DATABASE_URL)
//  2 instances      → connection_limit=10
//  5 instances      → connection_limit=5  (use PgBouncer instead at this scale)
//
//  Pool settings are passed via DATABASE_URL query params:
//    ?connection_limit=20&pool_timeout=20&connect_timeout=10
// ─────────────────────────────────────────────────────────────────────────────

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]   // show slow queries & errors in dev
        : ["error"],          // only errors in production
    errorFormat: "minimal",
  })
}

// ─── Global Singleton (prevents connection exhaustion during hot-reload) ──────
const globalForPrisma = globalThis as {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// ─── Graceful Shutdown (important for long-running servers) ──────────────────
// Releases all DB connections cleanly when the process exits.
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect()
  })
}