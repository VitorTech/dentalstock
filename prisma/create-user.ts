/**
 * Cria um usuário dentro de uma clínica (tenant) que já existe.
 * É o que destrava o primeiro acesso em produção, já que a migração de
 * multi-tenancy cria a "Clínica Principal" com os dados, mas nenhum usuário.
 *
 * Uso:
 *   npm run user:create -- <slug-da-clinica> <email> <senha> ["<Nome>"] [OWNER|MEMBER]
 *
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
      'Uso: npm run user:create -- <slug-da-clinica> <email> <senha> ["<Nome>"] [OWNER|MEMBER]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("A senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const email = emailRaw.toLowerCase().trim();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() },
    include: { _count: { select: { users: true } } },
  });

  if (!tenant) {
    const todas = await prisma.tenant.findMany({ select: { slug: true, name: true } });
    console.error(`Clínica com slug "${slug}" não encontrada.`);
    if (todas.length) {
      console.error("Clínicas existentes:");
      for (const t of todas) console.error(`  - ${t.slug}  (${t.name})`);
    } else {
      console.error("Nenhuma clínica cadastrada — use 'npm run tenant:create' primeiro.");
    }
    process.exit(1);
  }

  const jaExiste = await prisma.user.findUnique({ where: { email } });
  if (jaExiste) {
    console.error(`Já existe um usuário com o e-mail ${email}.`);
    process.exit(1);
  }

  // Primeiro usuário da clínica vira OWNER por padrão.
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
