/**
 * The clinic's team.
 *
 * Here the clinic itself is the actor, managing its own staff's access. Every
 * operation is scoped to the actor's tenant — no method takes a tenantId from
 * the outside, it always comes from the authenticated identity.
 *
 * Important guard: the `OWNER` role is not assignable through these use cases.
 * Otherwise any member could promote themselves through the invite form.
 */
import { PlainPassword, type User, canManageTeam } from "@/modules/identity/domain";
import { type AuthenticatedActor, BusinessRuleError, ConflictError, Email, ForbiddenError, NonEmptyText, NotFoundError, type UserRole, type Uuid } from "@/shared/domain";
import type { PasswordHasher, SessionRepository, UserRepository } from "../ports";

/** Roles a clinic may grant to its own team. */
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

    // Demoting yourself would remove the last access able to manage the team —
    // the clinic would be left with nobody able to grant permissions back.
    if (userId === actor.userId) {
      throw new BusinessRuleError("Você não pode alterar o seu próprio papel.");
    }

    const user = await this.users.findByIdInTenant(actor.tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (user.role === "OWNER") {
      throw new ForbiddenError("Este acesso é administrado pela plataforma.");
    }

    const updated = await this.users.updateRole(actor.tenantId, userId, role);

    // The role travels inside the token: without ending the sessions, the user
    // would keep the old permissions until the cookie expired (OWASP A01).
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
    // Same reason as changing a role: a password rotated after a suspected
    // leak protects nothing while the old cookie still works.
    await this.sessions.revokeAllForUser(user.id);
  }
}
