/**
 * Creates a user inside an existing clinic (tenant).
 *
 * Usage:
 *   npm run user:create -- <clinic-slug> <email> <password> ["<Name>"] [OWNER|MEMBER]
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const [slug, emailRaw, password, name, roleRaw] = process.argv.slice(2);

  if (!slug || !emailRaw || !password) {
    console.error(
      'Usage: npm run user:create -- <clinic-slug> <email> <password> ["<Name>"] [OWNER|MEMBER]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("The password must be at least 8 characters long.");
    process.exit(1);
  }

  const email = emailRaw.toLowerCase().trim();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() },
    include: { _count: { select: { users: true } } },
  });

  if (!tenant) {
    const all = await prisma.tenant.findMany({ select: { slug: true, name: true } });
    console.error(`No clinic found with slug "${slug}".`);
    if (all.length) {
      console.error("Existing clinics:");
      for (const t of all) console.error(`  - ${t.slug}  (${t.name})`);
    } else {
      console.error("No clinic registered yet — run 'npm run tenant:create' first.");
    }
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`A user with the e-mail ${email} already exists.`);
    process.exit(1);
  }

  // The clinic's first user becomes OWNER by default.
  const role = roleRaw?.toUpperCase() === "MEMBER" ? "MEMBER" : tenant._count.users === 0 ? "OWNER" : "MEMBER";

  await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash: hashPassword(password),
      role,
      tenantId: tenant.id,
    },
  });

  console.log(`✔ Usuário criado em "${tenant.name}"`);
  console.log(`  e-mail: ${email}`);
  console.log(`  perfil: ${role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
