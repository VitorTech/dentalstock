/** Value Objects de identidade. */
import { ValidationError } from "@/shared/domain";

/** Senha em texto puro, validada antes de ser transformada em hash.
 * Nunca é serializada — existe apenas durante a operação. */
export class PlainPassword {
  private constructor(readonly value: string) {}

  private static readonly MIN = 8;
  // Teto contra DoS por hashing de entrada gigante (OWASP A04).
  private static readonly MAX = 128;

  /**
   * Para DEFINIR uma senha (cadastro, reset): aplica a política de força.
   */
  static create(raw: unknown, field = "password"): PlainPassword {
    const value = PlainPassword.requirePresence(raw, field);
    if (value.length < PlainPassword.MIN) {
      throw new ValidationError(
        `A senha deve ter pelo menos ${PlainPassword.MIN} caracteres.`,
        field
      );
    }
    return new PlainPassword(value);
  }

  /**
   * Para CONFERIR uma senha no login: sem política de força, de propósito.
   *
   * Dois motivos:
   *  - aplicar o mínimo aqui travaria usuários cuja senha foi criada antes de a
   *    política existir, com uma mensagem que não ajuda em nada;
   *  - a mensagem "mínimo de N caracteres" na tela de login revelaria a política
   *    e distinguiria "senha curta" de "senha errada" (OWASP A07).
   * O único veredito no login deve ser "credencial válida ou não".
   */
  static forAuthentication(raw: unknown, field = "password"): PlainPassword {
    return new PlainPassword(PlainPassword.requirePresence(raw, field));
  }

  private static requirePresence(raw: unknown, field: string): string {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new ValidationError("Senha é obrigatória.", field);
    }
    // Teto mantido nos dois caminhos: protege contra DoS por hashing de
    // entrada enorme, sem revelar política de força.
    if (raw.length > PlainPassword.MAX) {
      throw new ValidationError("Senha muito longa.", field);
    }
    return raw;
  }

  /** Evita vazamento acidental em log ou resposta. */
  toJSON() {
    return "[REDACTED]";
  }
  toString() {
    return "[REDACTED]";
  }
}
