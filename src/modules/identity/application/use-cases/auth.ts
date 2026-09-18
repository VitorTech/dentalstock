/**
 * Authentication use cases.
 *
 * No SQL, no `req`/`res`, no library imports: domain and ports only. That is
 * what makes login testable without a database or a server.
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
    /** Origin of the attempt; `null` when the proxy did not report one. */
    ipAddress?: string | null;
  }): Promise<LoginResult> {
    // Validate before touching the database (OWASP: reject malformed input
    // early). Note `forAuthentication`: login applies no strength policy, only
    // presence — otherwise the answer would separate "short" from "wrong".
    const email = Email.create(input.email);
    const password = PlainPassword.forAuthentication(input.password);

    // Rate limit BEFORE comparing the password: a blocked request must not
    // cost a hash, or the defense becomes the attack (scrypt is expensive on
    // purpose).
    const limits = this.limitsFor(email.value, input.ipAddress ?? null);
    const counters = await this.loadCounters(limits);
    this.ensureNotBlocked(counters);

    const user = await this.users.findByEmail(email.value);

    // Identical message for a missing e-mail and a wrong password: it never
    // reveals which e-mails exist (OWASP A07 — user enumeration).
    const invalid = new UnauthorizedError("E-mail ou senha inválidos.");
    if (!user) {
      // Spends time comparable to the valid path so nothing leaks by timing.
      await this.hasher.verify(password.value, "dummy:0".padEnd(96, "0"));
      await this.registerFailure(counters);
      throw invalid;
    }

    const ok = await this.hasher.verify(password.value, user.passwordHash);
    if (!ok) {
      await this.registerFailure(counters);
      throw invalid;
    }

    // Success: the counters for this attempt disappear. That is what keeps the
    // block from becoming cumulative punishment for a few typos.
    await Promise.all(counters.map((counter) => this.throttle.clear(counter.key)));

    // The stored session is the revocation anchor: the JWT is accepted only
    // while its matching jti is active.
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
   * The keys counted for this attempt.
   *
   * With no known IP, the per-account limit remains — and that is the one
   * protecting a specific user's password, the likelier target.
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
    // One message for account and IP alike: knowing WHICH limit was hit would
    // tell the attacker whether that e-mail exists.
    if (wait > 0) throw new TooManyRequestsError(tooManyAttemptsMessage(wait), wait);
  }

  /**
   * Counts the failure against both keys.
   *
   * One unrecorded failure weakens the limit, but failing the login because a
   * counter failed would be worse: the writes run in parallel, and an error
   * here does not block the invalid-credentials answer.
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
 * Resolves the identity carried by a token.
 *
 * Double check on purpose: the JWT signature (fast, no database) and the
 * session record (which allows revoking access immediately — logout, password
 * change or user deletion). A bare JWT could not revoke anything.
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
      // Token issued before the name claim existed: authorship falls back to
      // the e-mail, which identifies the person just as well in the ledger.
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
    // Revokes even if the token already expired — idempotent by nature.
    if (claims?.sessionId) await this.sessions.revoke(claims.sessionId);
  }
}
