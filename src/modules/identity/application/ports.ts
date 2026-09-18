/** Identity ports: user and session persistence, password hashing and tokens. */
import type { User, UserCredentials } from "@/modules/identity/domain";
import type { UserRole, Uuid } from "@/shared/domain";

export interface UserRepository {
  findByEmail(email: string): Promise<UserCredentials | null>;
  findById(id: Uuid): Promise<User | null>;
  /** Scoped to the clinic: an id from another clinic results in "not found". */
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

/** Persisted session: the revocation anchor of the access token. */
export interface SessionRepository {
  create(data: { userId: Uuid; tokenId: string; expiresAt: Date }): Promise<void>;
  /** Whether the session is still valid (neither revoked nor expired). */
  isActive(tokenId: string): Promise<boolean>;
  revoke(tokenId: string): Promise<void>;
  revokeAllForUser(userId: Uuid): Promise<void>;
  deleteExpired(): Promise<number>;
}

/** Password hashing. The implementation picks algorithm and parameters. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /** Comparison must be constant-time (OWASP A02). */
  verify(plain: string, hash: string): Promise<boolean>;
}

/** Access token payload. Kept minimal: nothing sensitive goes into the JWT,
 * which is only signed — not encrypted. */
export interface AccessTokenClaims {
  /** subject: the user id */
  sub: Uuid;
  tenantId: Uuid;
  role: UserRole;
  email: string;
  /**
   * Display name, used to sign whoever performed an operation.
   *
   * It travels in the token so recording authorship costs no extra query on
   * every write. Optional because a token issued before this field existed is
   * still valid — in that case authorship falls back to the e-mail.
   */
  name?: string;
  /** jti: identifies the session, which is what makes revocation possible */
  sessionId: string;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/** JWT issuing and verification. */
export interface TokenService {
  issue(claims: AccessTokenClaims): Promise<IssuedToken>;
  /** Returns the claims when the token is authentic and unexpired; else null. */
  verify(token: string): Promise<AccessTokenClaims | null>;
}

/** Where the token travels between requests (httpOnly cookie, header, etc.). */
export interface TokenTransport {
  read(): Promise<string | null>;
  write(token: string, expiresAt: Date): Promise<void>;
  clear(): Promise<void>;
}
