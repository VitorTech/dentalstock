/**
 * Testes de login, com foco no limite de tentativas.
 *
 * Portas implementadas em memória, como nos demais testes: verifica-se o
 * EFEITO (bloqueou, contou, zerou) e não quais métodos foram chamados. O
 * relógio também é uma porta, então "quinze minutos depois" é instantâneo.
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
const SENHA = "SenhaCorreta123";
const IP = "203.0.113.7";
const AGORA = new Date("2026-09-17T09:00:00.000Z");

const usuario: UserCredentials = {
  id: "u1",
  tenantId: "t1",
  email: EMAIL,
  name: "Dra. Marina",
  role: "MEMBER",
  passwordHash: `hash:${SENHA}`,
};

class UsersEmMemoria implements Partial<UserRepository> {
  async findByEmail(email: string): Promise<UserCredentials | null> {
    return email === usuario.email ? usuario : null;
  }
}

class SessionsEmMemoria implements Partial<SessionRepository> {
  readonly criadas: { userId: Uuid; tokenId: string }[] = [];

  async create(data: { userId: Uuid; tokenId: string; expiresAt: Date }): Promise<void> {
    this.criadas.push({ userId: data.userId, tokenId: data.tokenId });
  }
}

/** Hash de brinquedo: o algoritmo real é assunto do adaptador, não desta regra. */
class HasherFalso implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hash:${plain}`;
  }
}

class TokensFalsos implements TokenService {
  async issue(claims: AccessTokenClaims): Promise<IssuedToken> {
    return { token: `token-${claims.sub}`, expiresAt: new Date(AGORA.getTime() + 86_400_000) };
  }
  async verify(): Promise<AccessTokenClaims | null> {
    return null;
  }
}

class ThrottleEmMemoria implements LoginThrottleRepository {
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
  chaves(): string[] {
    return [...this.estados.keys()].sort();
  }
  falhas(key: string): number {
    return this.estados.get(key)?.failures ?? 0;
  }
}

/** Relógio controlado: avança quando o teste manda. */
class RelogioFalso implements Clock {
  constructor(private instante: Date) {}
  now(): Date {
    return this.instante;
  }
  avancar(ms: number): void {
    this.instante = new Date(this.instante.getTime() + ms);
  }
}

function montar() {
  const throttle = new ThrottleEmMemoria();
  const sessions = new SessionsEmMemoria();
  const clock = new RelogioFalso(AGORA);
  const secrets: SecretGenerator = { token: () => "sessao-1" };

  const login = new LoginUseCase(
    new UsersEmMemoria() as unknown as UserRepository,
    sessions as unknown as SessionRepository,
    new HasherFalso(),
    new TokensFalsos(),
    secrets,
    clock,
    throttle
  );

  // Sequencial de propósito: é assim que uma pessoa (e um script de força
  // bruta) tenta. O comportamento sob rajada simultânea está em teste próprio.
  const errar = async (vezes: number, ipAddress: string | null = IP) => {
    for (let i = 0; i < vezes; i++) {
      await login.execute({ email: EMAIL, password: "senha-errada", ipAddress }).catch((e) => e);
    }
  };

  return { login, throttle, sessions, clock, errar };
}

/** Erra a senha em série, parando assim que o bloqueio aparece. */
async function errarAte(login: LoginUseCase, vezes: number) {
  for (let i = 0; i < vezes; i++) {
    const erro = await login
      .execute({ email: EMAIL, password: "senha-errada", ipAddress: IP })
      .catch((e) => e);
    if (erro instanceof TooManyRequestsError) return;
  }
}

describe("LoginUseCase", () => {
  it("credencial correta autentica e cria a sessão", async () => {
    const { login, sessions } = montar();

    const resultado = await login.execute({ email: EMAIL, password: SENHA, ipAddress: IP });

    expect(resultado.actor).toMatchObject({ userId: "u1", tenantId: "t1", role: "MEMBER" });
    expect(sessions.criadas).toHaveLength(1);
  });

  it("conta a falha nas duas chaves: conta e origem", async () => {
    const { throttle, errar } = montar();

    await errar(1);

    expect(throttle.chaves()).toEqual([`ip:${IP}`, `user:${EMAIL}`]);
    expect(throttle.falhas(`user:${EMAIL}`)).toBe(1);
  });

  it("bloqueia a conta depois do limite — mesmo com a senha certa", async () => {
    const { login, errar } = montar();

    await errar(LOGIN_MAX_FAILURES_PER_ACCOUNT);

    const erro = await login
      .execute({ email: EMAIL, password: SENHA, ipAddress: IP })
      .catch((e) => e);

    expect(erro).toBeInstanceOf(TooManyRequestsError);
    expect(erro.retryAfterSeconds).toBeGreaterThan(0);
    // A mensagem não diz se o e-mail existe nem qual limite estourou.
    expect(erro.message).not.toContain(EMAIL);
  });

  it("trocar de IP não contorna o limite da conta", async () => {
    const { login, errar } = montar();

    await errar(LOGIN_MAX_FAILURES_PER_ACCOUNT);

    const erro = await login
      .execute({ email: EMAIL, password: SENHA, ipAddress: "198.51.100.9" })
      .catch((e) => e);

    expect(erro).toBeInstanceOf(TooManyRequestsError);
  });

  it("o bloqueio expira: passados os quinze minutos, o login volta a funcionar", async () => {
    const { login, clock, errar } = montar();

    await errar(LOGIN_MAX_FAILURES_PER_ACCOUNT);
    clock.avancar(LOGIN_BLOCK_MS + 1000);

    const resultado = await login.execute({ email: EMAIL, password: SENHA, ipAddress: IP });

    expect(resultado.actor.userId).toBe("u1");
  });

  it("acertar a senha zera os contadores da tentativa", async () => {
    const { login, throttle, errar } = montar();

    await errar(3);
    await login.execute({ email: EMAIL, password: SENHA, ipAddress: IP });

    expect(throttle.chaves()).toEqual([]);
  });

  it("e-mail inexistente também conta — é o que um ataque usa para sondar contas", async () => {
    const { login, throttle } = montar();

    await login
      .execute({ email: "ninguem@clinica.com", password: "x".repeat(10), ipAddress: IP })
      .catch((e) => expect(e).toBeInstanceOf(UnauthorizedError));

    expect(throttle.falhas("user:ninguem@clinica.com")).toBe(1);
    expect(throttle.falhas(`ip:${IP}`)).toBe(1);
  });

  it("sem IP conhecido, o limite por conta continua valendo", async () => {
    const { login, throttle, errar } = montar();

    await errar(LOGIN_MAX_FAILURES_PER_ACCOUNT, null);

    expect(throttle.chaves()).toEqual([`user:${EMAIL}`]);
    await expect(
      login.execute({ email: EMAIL, password: SENHA, ipAddress: null })
    ).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("rajada simultânea ainda acaba bloqueada", async () => {
    // Ler-decidir-gravar não é atômico: tentativas disparadas ao mesmo tempo
    // leem o mesmo contador e algumas se perdem. O limite continua valendo —
    // só não é exato no instante da rajada. Aceitável porque o que se combate
    // é a insistência ao longo de minutos, e o custo da alternativa (bloqueio
    // de linha a cada tentativa de login) seria pago por todo mundo.
    const { login, throttle } = montar();

    await Promise.all(
      Array.from({ length: LOGIN_MAX_FAILURES_PER_ACCOUNT * 3, }, () =>
        login.execute({ email: EMAIL, password: "senha-errada", ipAddress: IP }).catch((e) => e)
      )
    );
    // Uma segunda rodada sequencial fecha o cerco mesmo no pior caso.
    await errarAte(login, LOGIN_MAX_FAILURES_PER_ACCOUNT);

    expect(throttle.falhas(`user:${EMAIL}`)).toBeGreaterThan(0);
    await expect(
      login.execute({ email: EMAIL, password: SENHA, ipAddress: IP })
    ).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("o limite por IP é mais alto que o da conta: uma clínica inteira sai por um endereço", () => {
    expect(LOGIN_MAX_FAILURES_PER_IP).toBeGreaterThan(LOGIN_MAX_FAILURES_PER_ACCOUNT);
  });
});
