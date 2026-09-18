/** Identity value objects. */
import { ValidationError } from "@/shared/domain";

/** Plain-text password, validated before it is turned into a hash.
 * Never serialized — it exists only for the duration of the operation. */
export class PlainPassword {
  private constructor(readonly value: string) {}

  private static readonly MIN = 8;
  // Cap against DoS by hashing a huge input (OWASP A04).
  private static readonly MAX = 128;

  /**
   * To SET a password (sign-up, reset): applies the strength policy.
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
   * To CHECK a password at login: no strength policy, on purpose.
   *
   * Two reasons:
   *  - enforcing the minimum here would lock out users whose password predates
   *    the policy, with a message that helps nobody;
   *  - a "minimum of N characters" message on the login screen would leak the
   *    policy and tell "short password" apart from "wrong password" (OWASP A07).
   * The only verdict at login should be "valid credentials or not".
   */
  static forAuthentication(raw: unknown, field = "password"): PlainPassword {
    return new PlainPassword(PlainPassword.requirePresence(raw, field));
  }

  private static requirePresence(raw: unknown, field: string): string {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new ValidationError("Senha é obrigatória.", field);
    }
    // The cap stays on both paths: it protects against DoS by hashing a huge
    // input without revealing the strength policy.
    if (raw.length > PlainPassword.MAX) {
      throw new ValidationError("Senha muito longa.", field);
    }
    return raw;
  }

  /** Prevents accidental leaks into logs or responses. */
  toJSON() {
    return "[REDACTED]";
  }
  toString() {
    return "[REDACTED]";
  }
}
