import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  console.log("=== CHECKING ADMINS IN DB ===");
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN"
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  console.log("Admins in DB:", JSON.stringify(admins, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
