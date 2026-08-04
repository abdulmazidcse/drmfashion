import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function verify() {
  const email = "admin@fashion.com";
  const password = "admin123";

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log("User not found!");
    return;
  }

  console.log("User found. Email:", user.email);
  console.log("Password hash in DB:", user.password);

  if (!user.password) {
    console.log("Password in DB is null or empty!");
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  console.log(`Comparison result for "${password}":`, isValid);

  // Let's also check if there is any trailing space or anything
  const isValidTrimmed = await bcrypt.compare(password.trim(), user.password);
  console.log(`Comparison result for trimmed "${password.trim()}":`, isValidTrimmed);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
