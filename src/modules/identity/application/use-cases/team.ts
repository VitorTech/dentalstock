/**
 * Equipe da clínica.
 *
 * Diferente de `administration.ts`, que é o console da PLATAFORMA: aqui quem
 * age é a própria clínica, gerenciando os acessos da sua equipe. Toda operação
 * é restrita ao tenant do ator — nenhum método recebe tenantId de fora, ele vem
 * sempre da identidade autenticada.
 *
 * Trava importante: o papel `OWNER` (administrador da plataforma) não é
 * atribuível por aqui. Se fosse, qualquer clínica poderia se promover a
 * operadora do sistema pelo formulário de convite.
 */
import { PlainPassword, type User, canManageTeam } from "@/modules/identity/domain";
import { type AuthenticatedActor, BusinessRuleError, ConflictError, Email, ForbiddenError, NonEmptyText, NotFoundError, type UserRole, type Uuid } from "@/shared/domain";
import type { PasswordHasher, SessionRepository, UserRepository } from "../ports";

/** Papéis que a clínica pode conceder à sua equipe. */
const ASSIGNABLE_ROLES: readonly UserRole[] = ["MEMBER", "ASSISTANT"];

function readAssignableRole(raw: unknown): UserRole {
  if (typeof raw !== "string" || !ASSIGNABLE_ROLES.includes(raw as UserRole)) {
    throw new BusinessRuleError("Papel inválido. Use MEMBER ou ASSISTANT.");
  }
  return raw as UserRole;
}

function requireManager(actor: AuthenticatedActor): void {
  if (!canManageTeam(actor.role)) {
    throw new ForbiddenError("Somente a equipe responsável pode gerenciar acessos.");
  }
}

export class ListTeamUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: AuthenticatedActor): Promise<User[]> {
    requireManager(actor);
    return this.users.listByTenant(actor.tenantId);
  }
}

export class InviteTeamMemberUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(
    actor: AuthenticatedActor,
    input: { email: unknown; name?: unknown; password: unknown; role: unknown }
  ): Promise<User> {
    requireManager(actor);

    const email = Email.create(input.email);
    const password = PlainPassword.create(input.password);
    const role = readAssignableRole(input.role);

    if (await this.users.existsByEmail(email.value)) {
      throw new ConflictError("Já existe um usuário com este e-mail.");
    }

    const name =
      input.name === undefined || input.name === null || input.name === ""
        ? email.value.split("@")[0]
        : NonEmptyText.create(input.name, "nome", { min: 2, max: 120 }).value;

    return this.users.create({
      tenantId: actor.tenantId,
      email: email.value,
      name,
      passwordHash: await this.hasher.hash(password.value),
      role,
    });
  }
}

export class ChangeTeamMemberRoleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository
  ) {}

  async execute(actor: AuthenticatedActor, userId: Uuid, roleRaw: unknown): Promise<User> {
    requireManager(actor);
    const role = readAssignableRole(roleRaw);

    // Rebaixar a si mesmo tiraria o último acesso capaz de gerenciar equipe —
    // a clínica ficaria sem quem conceda permissão de volta.
    if (userId === actor.userId) {
      throw new BusinessRuleError("Você não pode alterar o seu próprio papel.");
    }

    const user = await this.users.findByIdInTenant(actor.tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (user.role === "OWNER") {
      throw new ForbiddenError("Este acesso é administrado pela plataforma.");
    }

    const updated = await this.users.updateRole(actor.tenantId, userId, role);

    // O papel viaja no token: sem encerrar as sessões, o usuário continuaria
    // com as permissões antigas até o cookie expirar (OWASP A01).
    await this.sessions.revokeAllForUser(userId);
    return updated;
  }
}

export class RemoveTeamMemberUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: AuthenticatedActor, userId: Uuid): Promise<void> {
    requireManager(actor);

    if (userId === actor.userId) {
      throw new BusinessRuleError("Você não pode excluir a si mesmo.");
    }

    const user = await this.users.findByIdInTenant(actor.tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (user.role === "OWNER") {
      throw new ForbiddenError("Este acesso é administrado pela plataforma.");
    }

    await this.users.delete(user.id);
  }
}

export class ResetTeamMemberPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(actor: AuthenticatedActor, userId: Uuid, newPassword: unknown): Promise<void> {
    requireManager(actor);
    const password = PlainPassword.create(newPassword);

    const user = await this.users.findByIdInTenant(actor.tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (user.role === "OWNER") {
      throw new ForbiddenError("Este acesso é administrado pela plataforma.");
    }

    await this.users.updatePassword(user.id, await this.hasher.hash(password.value));
    // Mesma razão de `ResetUserPasswordUseCase`: senha trocada por suspeita de
    // vazamento não protege nada se o cookie antigo continuar valendo.
    await this.sessions.revokeAllForUser(user.id);
  }
}
