/**
 * Provisiona uma nova clínica (tenant) com o usuário dono.
 *
 * Uso:
 *   npm run tenant:create -- "Clínica Sorriso" sorriso dono@sorriso.com "SenhaForte123" "Dra. Ana"
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
  const [name, slug, email, password, userName] = process.argv.slice(2);

  if (!name || !slug || !email || !password) {
    console.error(
      'Uso: npm run tenant:create -- "<Nome da Clínica>" <slug> <email> <senha> ["<Nome do usuário>"]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("A senha deve ter pelo menos 8 caracteres.");
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

  console.log(`✔ Clínica "${name}" criada (slug: ${tenant.slug}, id: ${tenant.id})`);
  console.log(`✔ Usuário dono: ${email.toLowerCase()}`);
  console.log(
    "\nA clínica começa vazia — cadastre materiais, instrumentais e procedimentos pela interface."
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
