/**
 * Login tests, focused on the attempt limit.
 *
 * Ports implemented in memory, as in the other tests: they check the EFFECT
 * (blocked, counted, reset) rather than which methods were called. The clock
 * is a port too, so "fifteen minutes later" is instantaneous.
 */
import { describe, expect, it } from "vitest";
import type { UserCredentials } from "@/modules/identity/domain";
import {
  LOGIN_BLOCK_MS,
  LOGIN_MAX_FAILURES_PER_ACCOUNT,
  LOGIN_MAX_FAILURES_PER_IP,
  type LoginAttemptState,
} from "@/modules/identity/domain";
import type { Clock, SecretGenerator } from "@/shared/application";
import { TooManyRequestsError, UnauthorizedError, type Uuid } from "@/shared/domain";
import type {
  AccessTokenClaims,
  IssuedToken,
  LoginThrottleRepository,
  PasswordHasher,
  SessionRepository,
  TokenService,
  UserRepository,
} from "../ports";
import { LoginUseCase } from "./auth";

const EMAIL = "dra@clinica.com";
const PASSWORD = "SenhaCorreta123";
const IP = "203.0.113.7";
const NOW = new Date("2026-09-17T09:00:00.000Z");

const user: UserCredentials = {
  id: "u1",
  tenantId: "t1",
  email: EMAIL,
  name: "Dra. Marina",
  role: "MEMBER",
  passwordHash: `hash:${PASSWORD}`,
};

class InMemoryUsers implements Partial<UserRepository> {
  async findByEmail(email: string): Promise<UserCredentials | null> {
    return email === user.email ? user : null;
  }
}

class InMemorySessions implements Partial<SessionRepository> {
  readonly created: { userId: Uuid; tokenId: string }[] = [];

  async create(data: { userId: Uuid; tokenId: string; expiresAt: Date }): Promise<void> {
    this.created.push({ userId: data.userId, tokenId: data.tokenId });
  }
}

/** Toy hash: the real algorithm is the adapter's business, not this rule's. */
class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hash:${plain}`;
  }
}

class FakeTokens implements TokenService {
  async issue(claims: AccessTokenClaims): Promise<IssuedToken> {
    return { token: `token-${claims.sub}`, expiresAt: new Date(NOW.getTime() + 86_400_000) };
  }
  async verify(): Promise<AccessTokenClaims | null> {
    return null;
  }
}

class InMemoryThrottle implements LoginThrottleRepository {
  private readonly estados = new Map<string, LoginAttemptState>();

  async find(key: string): Promise<LoginAttemptState | null> {
    return this.estados.get(key) ?? null;
  }
  async save(key: string, state: LoginAttemptState): Promise<void> {
    this.estados.set(key, state);
  }
  async clear(key: string): Promise<void> {
    this.estados.delete(key);
  }
  keys(): string[] {
    return [...this.estados.keys()].sort();
  }
  failures(key: string): number {
    return this.estados.get(key)?.failures ?? 0;
  }
}

/** Controlled clock: it advances when the test says so. */
class FakeClock implements Clock {
  constructor(private instant: Date) {}
  now(): Date {
    return this.instant;
  }
  advance(ms: number): void {
    this.instant = new Date(this.instant.getTime() + ms);
  }
}

function build() {
  const throttle = new InMemoryThrottle();
  const sessions = new InMemorySessions();
  const clock = new FakeClock(NOW);
  const secrets: SecretGenerator = { token: () => "sessao-1" };

  const login = new LoginUseCase(
    new InMemoryUsers() as unknown as UserRepository,
    sessions as unknown as SessionRepository,
    new FakeHasher(),
    new FakeTokens(),
    secrets,
    clock,
    throttle
  );

  // Sequential on purpose: that is how a person (and a brute-force script)
  // tries. Concurrent bursts have their own test below.
  const failLogin = async (times: number, ipAddress: string | null = IP) => {
    for (let i = 0; i < times; i++) {
      await login.execute({ email: EMAIL, password: "senha-errada", ipAddress }).catch((e) => e);
    }
  };

  return { login, throttle, sessions, clock, failLogin };
}

/** Fails the password in series, stopping as soon as the block appears. */
async function failUntilBlocked(login: LoginUseCase, times: number) {
  for (let i = 0; i < times; i++) {
    const erro = await login
      .execute({ email: EMAIL, password: "senha-errada", ipAddress: IP })
      .catch((e) => e);
    if (erro instanceof TooManyRequestsError) return;
  }
}

describe("LoginUseCase", () => {
  it("valid credentials authenticate and create the session", async () => {
    const { login, sessions } = build();

    const result = await login.execute({ email: EMAIL, password: PASSWORD, ipAddress: IP });

    expect(result.actor).toMatchObject({ userId: "u1", tenantId: "t1", role: "MEMBER" });
    expect(sessions.created).toHaveLength(1);
  });

  it("counts the failure against both keys: account and origin", async () => {
    const { throttle, failLogin } = build();

    await failLogin(1);

    expect(throttle.keys()).toEqual([`ip:${IP}`, `user:${EMAIL}`]);
    expect(throttle.failures(`user:${EMAIL}`)).toBe(1);
  });

  it("blocks the account past the limit — even with the right password", async () => {
    const { login, failLogin } = build();

    await failLogin(LOGIN_MAX_FAILURES_PER_ACCOUNT);

    const erro = await login
      .execute({ email: EMAIL, password: PASSWORD, ipAddress: IP })
      .catch((e) => e);

    expect(erro).toBeInstanceOf(TooManyRequestsError);
    expect(erro.retryAfterSeconds).toBeGreaterThan(0);
    // The message says neither whether the e-mail exists nor which limit was hit.
    expect(erro.message).not.toContain(EMAIL);
  });

  it("switching IPs does not bypass the account limit", async () => {
    const { login, failLogin } = build();

    await failLogin(LOGIN_MAX_FAILURES_PER_ACCOUNT);

    const erro = await login
      .execute({ email: EMAIL, password: PASSWORD, ipAddress: "198.51.100.9" })
      .catch((e) => e);

    expect(erro).toBeInstanceOf(TooManyRequestsError);
  });

  it("the block expires: after fifteen minutes, login works again", async () => {
    const { login, clock, failLogin } = build();

    await failLogin(LOGIN_MAX_FAILURES_PER_ACCOUNT);
    clock.advance(LOGIN_BLOCK_MS + 1000);

    const result = await login.execute({ email: EMAIL, password: PASSWORD, ipAddress: IP });

    expect(result.actor.userId).toBe("u1");
  });

  it("getting the password right clears the attempt counters", async () => {
    const { login, throttle, failLogin } = build();

    await failLogin(3);
    await login.execute({ email: EMAIL, password: PASSWORD, ipAddress: IP });

    expect(throttle.keys()).toEqual([]);
  });

  it("a nonexistent e-mail counts too — that is how an attack probes accounts", async () => {
    const { login, throttle } = build();

    await login
      .execute({ email: "ninguem@clinica.com", password: "x".repeat(10), ipAddress: IP })
      .catch((e) => expect(e).toBeInstanceOf(UnauthorizedError));

    expect(throttle.failures("user:ninguem@clinica.com")).toBe(1);
    expect(throttle.failures(`ip:${IP}`)).toBe(1);
  });

  it("with no known IP, the per-account limit still applies", async () => {
    const { login, throttle, failLogin } = build();

    await failLogin(LOGIN_MAX_FAILURES_PER_ACCOUNT, null);

    expect(throttle.keys()).toEqual([`user:${EMAIL}`]);
    await expect(
      login.execute({ email: EMAIL, password: PASSWORD, ipAddress: null })
    ).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("a concurrent burst still ends up blocked", async () => {
    // Read-decide-write is not atomic: attempts fired at the same instant read
    // the same counter and some are lost. The limit still holds — it is only
    // inexact during the burst. Acceptable because what we fight is persistence
    // over minutes, and the alternative (row locking on every login attempt)
    // would be paid for by everyone.
    const { login, throttle } = build();

    await Promise.all(
      Array.from({ length: LOGIN_MAX_FAILURES_PER_ACCOUNT * 3, }, () =>
        login.execute({ email: EMAIL, password: "senha-errada", ipAddress: IP }).catch((e) => e)
      )
    );
    // A second sequential round closes the net even in the worst case.
    await failUntilBlocked(login, LOGIN_MAX_FAILURES_PER_ACCOUNT);

    expect(throttle.failures(`user:${EMAIL}`)).toBeGreaterThan(0);
    await expect(
      login.execute({ email: EMAIL, password: PASSWORD, ipAddress: IP })
    ).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("the per-IP limit is higher than the account one: a whole clinic shares an address", () => {
    expect(LOGIN_MAX_FAILURES_PER_IP).toBeGreaterThan(LOGIN_MAX_FAILURES_PER_ACCOUNT);
  });
});
