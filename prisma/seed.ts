import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { seedTenantCatalog } from "../src/modules/catalog/adapters/out/prisma/default-catalog";

const prisma = new PrismaClient();

// Same format as the hashing adapter ("salt:hash" with scrypt).
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  // The seed's default clinic (tenant) and the user for the first sign-in.
  const slug = process.env.SEED_TENANT_SLUG ?? "principal";
  const tenantName = process.env.SEED_TENANT_NAME ?? "Clínica Principal";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@clinica.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { name: tenantName, slug },
  });
  const tenantId = tenant.id;

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: process.env.SEED_ADMIN_NAME ?? "Administrador",
      passwordHash: hashPassword(adminPassword),
      role: "OWNER",
      tenantId,
    },
  });
  console.log(`Clinic "${tenantName}" — login: ${adminEmail} / password: ${adminPassword}`);

  console.log("Clearing this clinic's existing data...");
  await prisma.stockMovement.deleteMany({ where: { tenantId } });
  await prisma.procedureMaterial.deleteMany({ where: { procedure: { tenantId } } });
  await prisma.procedureInstrument.deleteMany({ where: { procedure: { tenantId } } });
  await prisma.procedure.deleteMany({ where: { tenantId } });
  await prisma.material.deleteMany({ where: { tenantId } });
  await prisma.instrument.deleteMany({ where: { tenantId } });

  console.log("Creating the default catalog (materials, instruments and procedures)...");
  await seedTenantCatalog(prisma, tenantId);

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
