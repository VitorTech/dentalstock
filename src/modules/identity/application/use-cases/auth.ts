/**
 * Casos de uso de autenticação.
 *
 * Nenhuma linha de SQL, nenhum `req`/`res`, nenhum import de biblioteca: só
 * domínio e portas. É o que permite testar login sem subir banco nem servidor.
 */
import {
  LOGIN_MAX_FAILURES_PER_ACCOUNT,
  type LoginAttemptState,
  LOGIN_MAX_FAILURES_PER_IP,
  PlainPassword,
  afterFailedAttempt,
  secondsUntilUnblocked,
  tooManyAttemptsMessage,
} from "@/modules/identity/domain";
import type { Clock, SecretGenerator } from "@/shared/application";
import { type AuthenticatedActor, Email, TooManyRequestsError, UnauthorizedError } from "@/shared/domain";
import type { LoginThrottleRepository, PasswordHasher, SessionRepository, TokenService, UserRepository } from "../ports";

const SESSION_TTL_DAYS = 30;

export interface LoginResult {
  token: string;
  expiresAt: Date;
  actor: AuthenticatedActor;
}

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly secrets: SecretGenerator,
    private readonly clock: Clock,
    private readonly throttle: LoginThrottleRepository
  ) {}

  async execute(input: {
    email: unknown;
    password: unknown;
    /** Origem da tentativa; `null` quando o proxy não informou. */
    ipAddress?: string | null;
  }): Promise<LoginResult> {
    // Validação antes de tocar o banco (OWASP: rejeitar entrada malformada cedo).
    // Note `forAuthentication`: no login não se aplica política de força, só
    // presença — senão a resposta distinguiria "senha curta" de "senha errada".
    const email = Email.create(input.email);
    const password = PlainPassword.forAuthentication(input.password);

    // Limite de tentativas ANTES de comparar a senha: um pedido bloqueado não
    // pode custar um hash, senão o próprio mecanismo vira o ataque (scrypt é
    // caro de propósito).
    const limits = this.limitsFor(email.value, input.ipAddress ?? null);
    const counters = await this.loadCounters(limits);
    this.ensureNotBlocked(counters);

    const user = await this.users.findByEmail(email.value);

    // Mensagem idêntica para e-mail inexistente e senha errada: não revela
    // quais e-mails existem (OWASP A07 — enumeração de usuários).
    const invalid = new UnauthorizedError("E-mail ou senha inválidos.");
    if (!user) {
      // Gasta tempo comparável ao caminho válido para não vazar por timing.
      await this.hasher.verify(password.value, "dummy:0".padEnd(96, "0"));
      await this.registerFailure(counters);
      throw invalid;
    }

    const ok = await this.hasher.verify(password.value, user.passwordHash);
    if (!ok) {
      await this.registerFailure(counters);
      throw invalid;
    }

    // Acertou: os contadores desta tentativa somem. É o que impede o bloqueio
    // de virar punição acumulada para quem só digitou errado algumas vezes.
    await Promise.all(counters.map((counter) => this.throttle.clear(counter.key)));

    // A sessão registrada é a âncora de revogação: o JWT é aceito somente
    // enquanto o jti correspondente estiver ativo.
    const sessionId = this.secrets.token(32);
    const expiresAt = new Date(
      this.clock.now().getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    await this.sessions.create({ userId: user.id, tokenId: sessionId, expiresAt });

    const issued = await this.tokens.issue({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      sessionId,
    });

    return {
      token: issued.token,
      expiresAt: issued.expiresAt,
      actor: {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * As chaves contadas nesta tentativa.
   *
   * Sem IP conhecido resta o limite por conta — que é o que protege a senha de
   * um usuário específico, o alvo mais provável.
   */
  private limitsFor(email: string, ipAddress: string | null) {
    const limits = [{ key: `user:${email}`, maxFailures: LOGIN_MAX_FAILURES_PER_ACCOUNT }];
    if (ipAddress) {
      limits.push({ key: `ip:${ipAddress}`, maxFailures: LOGIN_MAX_FAILURES_PER_IP });
    }
    return limits;
  }

  private async loadCounters(limits: { key: string; maxFailures: number }[]) {
    return Promise.all(
      limits.map(async (limit) => ({ ...limit, state: await this.throttle.find(limit.key) }))
    );
  }

  private ensureNotBlocked(counters: { state: LoginAttemptState | null }[]): void {
    const now = this.clock.now();
    const wait = Math.max(...counters.map((c) => secondsUntilUnblocked(c.state, now)), 0);
    // Mensagem única para conta e IP: saber QUAL limite bateu diria ao atacante
    // se aquele e-mail existe.
    if (wait > 0) throw new TooManyRequestsError(tooManyAttemptsMessage(wait), wait);
  }

  /**
   * Conta a falha nas duas chaves.
   *
   * Uma falha registrada a menos enfraquece o limite, mas derrubar o login
   * porque o contador falhou seria pior: o registro é feito em paralelo e um
   * erro aqui não impede a resposta de credencial inválida.
   */
  private async registerFailure(
    counters: { key: string; maxFailures: number; state: LoginAttemptState | null }[]
  ): Promise<void> {
    const now = this.clock.now();
    await Promise.all(
      counters.map((counter) =>
        this.throttle.save(counter.key, afterFailedAttempt(counter.state, now, counter.maxFailures))
      )
    );
  }
}

/**
 * Resolve a identidade a partir do token.
 *
 * Dupla verificação de propósito: assinatura do JWT (rápida, sem banco) e
 * existência da sessão (permite revogar acesso na hora — logout, troca de senha
 * ou exclusão do usuário). JWT puro não conseguiria revogar.
 */
export class AuthenticateUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly sessions: SessionRepository
  ) {}

  async execute(token: string | null): Promise<AuthenticatedActor | null> {
    if (!token) return null;

    const claims = await this.tokens.verify(token);
    if (!claims) return null;

    const active = await this.sessions.isActive(claims.sessionId);
    if (!active) return null;

    return {
      userId: claims.sub,
      tenantId: claims.tenantId,
      role: claims.role,
      email: claims.email,
      // Token emitido antes de o nome existir na claim: a autoria cai para o
      // e-mail, que identifica a pessoa igualmente bem no extrato.
      name: claims.name ?? claims.email,
    };
  }
}

export class LogoutUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly sessions: SessionRepository
  ) {}

  async execute(token: string | null): Promise<void> {
    if (!token) return;
    const claims = await this.tokens.verify(token);
    // Revoga mesmo que o token já esteja expirado — idempotente por natureza.
    if (claims?.sessionId) await this.sessions.revoke(claims.sessionId);
  }
}
