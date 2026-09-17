/** Portas de identidade: persistência de usuários e sessões, hash de senha e tokens. */
import type { LoginAttemptState, User, UserCredentials } from "@/modules/identity/domain";
import type { UserRole, Uuid } from "@/shared/domain";

export interface UserRepository {
  findByEmail(email: string): Promise<UserCredentials | null>;
  findById(id: Uuid): Promise<User | null>;
  /** Busca restrita à clínica: id de outra clínica resulta em "não encontrado". */
  findByIdInTenant(tenantId: Uuid, id: Uuid): Promise<User | null>;
  listByTenant(tenantId: Uuid): Promise<User[]>;
  existsByEmail(email: string): Promise<boolean>;
  create(data: {
    tenantId: Uuid;
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<User>;
  updatePassword(id: Uuid, passwordHash: string): Promise<void>;
  updateRole(tenantId: Uuid, id: Uuid, role: UserRole): Promise<User>;
  delete(id: Uuid): Promise<void>;
}

/** Sessão persistida: âncora de revogação do token de acesso. */
export interface SessionRepository {
  create(data: { userId: Uuid; tokenId: string; expiresAt: Date }): Promise<void>;
  /** Verifica se a sessão segue válida (não revogada nem expirada). */
  isActive(tokenId: string): Promise<boolean>;
  revoke(tokenId: string): Promise<void>;
  revokeAllForUser(userId: Uuid): Promise<void>;
  deleteExpired(): Promise<number>;
}

/**
 * Contadores de tentativa de login.
 *
 * Porta separada do repositório de usuários de propósito: o contador existe
 * para e-mails que sequer têm conta (é justamente o que um ataque tenta
 * descobrir), então ele não pertence ao agregado de usuário.
 *
 * A implementação precisa ser compartilhada por todas as instâncias da
 * aplicação e sobreviver a reinício — um contador em memória volta a zero a
 * cada deploy, que é exatamente quando um ataque lento se beneficiaria.
 */
export interface LoginThrottleRepository {
  find(key: string): Promise<LoginAttemptState | null>;
  save(key: string, state: LoginAttemptState): Promise<void>;
  /** Some com o contador (login bem-sucedido). */
  clear(key: string): Promise<void>;
}

/** Hash de senha. A implementação escolhe o algoritmo e os parâmetros. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /** Comparação obrigatoriamente em tempo constante (OWASP A02). */
  verify(plain: string, hash: string): Promise<boolean>;
}

/** Conteúdo do token de acesso. Mantido mínimo: nada sensível vai no JWT,
 * que é apenas assinado — não criptografado. */
export interface AccessTokenClaims {
  /** subject: id do usuário */
  sub: Uuid;
  tenantId: Uuid;
  role: UserRole;
  email: string;
  /**
   * Nome de exibição, usado como assinatura de quem executou uma operação.
   *
   * Viaja no token para que registrar autoria não custe uma consulta extra a
   * cada escrita. Opcional porque token emitido antes deste campo continua
   * válido — nesse caso a autoria cai para o e-mail.
   */
  name?: string;
  /** jti: identifica a sessão, permitindo revogação */
  sessionId: string;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/** Emissão e verificação de JWT. */
export interface TokenService {
  issue(claims: AccessTokenClaims): Promise<IssuedToken>;
  /** Devolve as claims se o token for autêntico e não expirado; senão null. */
  verify(token: string): Promise<AccessTokenClaims | null>;
}

/** Onde o token viaja entre requisições (cookie httpOnly, header, etc.). */
export interface TokenTransport {
  read(): Promise<string | null>;
  write(token: string, expiresAt: Date): Promise<void>;
  clear(): Promise<void>;
}
