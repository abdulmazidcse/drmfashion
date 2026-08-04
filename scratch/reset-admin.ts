import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function reset() {
  const email = "admin@fashion.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} not found. Creating...`);
    const newUser = await prisma.user.create({
      data: {
        email,
        name: "Super Admin",
        password: hashedPassword,
        role: "ADMIN"
      }
    });
    console.log("Created admin user:", newUser);
  } else {
    console.log(`User ${email} found. Resetting password...`);
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: "ADMIN" // Ensure they have the ADMIN role
      }
    });
    console.log("Updated admin user:", updatedUser);
  }
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
