/**
 * Provisions a new clinic (tenant) together with its owner user.
 *
 * Usage:
 *   npm run tenant:create -- "Clinica Sorriso" sorriso owner@sorriso.com "StrongPass123" "Dra. Ana"
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const [name, slug, email, password, userName] = process.argv.slice(2);

  if (!name || !slug || !email || !password) {
    console.error(
      'Usage: npm run tenant:create -- "<Clinic name>" <slug> <email> <password> ["<User name>"]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("The password must be at least 8 characters long.");
    process.exit(1);
  }

  const tenant = await prisma.tenant.create({
    data: { name, slug: slug.toLowerCase() },
  });

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: userName || name,
      passwordHash: hashPassword(password),
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  console.log(`✔ Clinic "${name}" created (slug: ${tenant.slug}, id: ${tenant.id})`);
  console.log(`✔ Owner user: ${email.toLowerCase()}`);
  console.log(
    "\nThe clinic starts empty — add materials, instruments and procedures through the interface."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
