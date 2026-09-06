/**
 * Stamp every pre-existing account as verified.
 *
 * Email verification was added after these accounts were created, so without
 * this every one of them would be refused at login. Guest-checkout rows are
 * skipped — they cannot log in anyway.
 *
 *   npx tsx scripts/backfill-email-verified.ts           # dry run
 *   npx tsx scripts/backfill-email-verified.ts --apply
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  const where = {
    emailVerifiedAt: null,
    deletedAt: null,
    NOT: { password: { startsWith: "GUEST_" } },
  }

  const pending = await prisma.user.findMany({
    where,
    select: { email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(APPLY ? "APPLY" : "DRY RUN", `— ${pending.length} account(s) to stamp\n`)
  pending.forEach(u => console.log(`  ${u.role.padEnd(5)} ${u.email}`))

  if (!APPLY) {
    console.log("\nRe-run with --apply to commit.")
    return
  }

  const res = await prisma.user.updateMany({ where, data: { emailVerifiedAt: new Date() } })
  console.log(`\nStamped ${res.count} account(s).`)
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
