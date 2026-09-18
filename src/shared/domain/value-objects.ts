/**
 * Primitive value objects shared by more than one module.
 *
 * Each type enforces its own invariants in the constructor: if an instance
 * exists, it is valid. That concentrates validation (OWASP A03 — allowlist
 * validation at the domain boundary) instead of scattering it across routes.
 *
 * Context-specific value objects live in their own module's domain.
 */
import { ValidationError } from "./errors";

/** Normalized e-mail (lowercase, no surrounding spaces). */
export class Email {
  private constructor(readonly value: string) {}

  // Deliberately conservative check: a single "@", non-empty parts, a dotted
  // domain and no spaces. It does not try to cover all of RFC 5322 — an
  // address is only truly confirmed by sending a message to it.
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX = 254; // practical e-mail length limit

  static create(raw: unknown, field = "email"): Email {
    if (typeof raw !== "string") {
      throw new ValidationError("E-mail é obrigatório.", field);
    }
    const value = raw.trim().toLowerCase();
    if (value.length === 0) throw new ValidationError("E-mail é obrigatório.", field);
    if (value.length > Email.MAX) throw new ValidationError("E-mail muito longo.", field);
    if (!Email.PATTERN.test(value)) throw new ValidationError("E-mail inválido.", field);
    return new Email(value);
  }

  toString() {
    return this.value;
  }
}

/** Brazilian phone number (10 or 11 digits, area code included). */
export class PhoneNumber {
  private constructor(
    readonly digits: string,
    readonly formatted: string
  ) {}

  static create(raw: unknown, field = "phone"): PhoneNumber {
    if (typeof raw !== "string") {
      throw new ValidationError("Telefone é obrigatório.", field);
    }
    const digits = raw.replace(/\D/g, "");
    // Accepts 12-13 digits for numbers that already carry the country code.
    const local = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
    if (local.length < 10 || local.length > 11) {
      throw new ValidationError("Informe um telefone com DDD.", field);
    }
    return new PhoneNumber(local, raw.trim());
  }

  toString() {
    return this.formatted;
  }
}

/** Required short text (names, titles), capped against abuse. */
export class NonEmptyText {
  private constructor(readonly value: string) {}

  static create(raw: unknown, field: string, opts: { min?: number; max?: number } = {}) {
    const min = opts.min ?? 2;
    const max = opts.max ?? 200;
    if (typeof raw !== "string") throw new ValidationError(`${field} é obrigatório.`, field);
    const value = raw.trim();
    if (value.length < min) throw new ValidationError(`${field} é obrigatório.`, field);
    if (value.length > max) throw new ValidationError(`${field} excede ${max} caracteres.`, field);
    return new NonEmptyText(value);
  }

  /**
   * Optional text: absence, a non-string value or an empty string become
   * `null`; text that is present goes through the same rules as `create`,
   * bounded by `max`.
   *
   * Replaces three private helpers that existed under different names
   * (`optionalText`, `optionalNote` and variations) with the same rule.
   */
  static optional(raw: unknown, field: string, max = 200): string | null {
    if (typeof raw !== "string") return null;
    const value = raw.trim();
    if (value === "") return null;
    return NonEmptyText.create(value, field, { min: 1, max }).value;
  }

  toString() {
    return this.value;
  }
}

/** Positive, finite quantity (stock, consumption). */
export class Quantity {
  private constructor(readonly value: number) {}

  static create(raw: unknown, field = "quantity"): Quantity {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new ValidationError("Quantidade inválida.", field);
    }
    if (raw <= 0) throw new ValidationError("A quantidade deve ser maior que zero.", field);
    if (raw > 1_000_000) throw new ValidationError("Quantidade acima do limite.", field);
    return new Quantity(raw);
  }
}

/** Stock level: zero is allowed, negative is not. */
export class StockLevel {
  private constructor(readonly value: number) {}

  static create(raw: unknown, field = "stock"): StockLevel {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new ValidationError("Valor de estoque inválido.", field);
    }
    if (raw < 0) throw new ValidationError("O estoque não pode ser negativo.", field);
    if (raw > 10_000_000) throw new ValidationError("Valor de estoque acima do limite.", field);
    return new StockLevel(raw);
  }
}

/**
 * Monetary value in Brazilian reais.
 *
 * Rounds to cents at the boundary: cost enters both from forms and from the
 * weighted-average calculation, and letting `0.1 + 0.2` travel through the
 * system would leave reports off by a fraction of a cent.
 */
export class Money {
  private constructor(readonly value: number) {}

  private static readonly MAX = 1_000_000;

  static create(raw: unknown, field = "unitCost"): Money {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new ValidationError("Valor inválido.", field);
    }
    if (raw < 0) throw new ValidationError("O valor não pode ser negativo.", field);
    if (raw > Money.MAX) throw new ValidationError("Valor acima do limite.", field);
    return new Money(Math.round(raw * 100) / 100);
  }

  /** Accepts absence: the cost field is optional everywhere in the system. */
  static optional(raw: unknown, field = "unitCost"): number | null {
    if (raw === undefined || raw === null || raw === "") return null;
    return Money.create(raw, field).value;
  }
}

/**
 * Calendar date coming from an `<input type="date">` (YYYY-MM-DD).
 *
 * Pins the time at noon UTC on purpose: `new Date("2026-08-02")` is midnight
 * UTC, which in Brazil's timezone falls back to the 1st — an expiry date would
 * show up on screen one day earlier than the one that was typed.
 */
export class CalendarDate {
  private constructor(readonly value: Date) {}

  static create(raw: unknown, field = "date"): CalendarDate {
    if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
      throw new ValidationError("Data inválida.", field);
    }
    const parsed = new Date(`${raw.trim()}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new ValidationError("Data inválida.", field);
    return new CalendarDate(parsed);
  }

  static optional(raw: unknown, field = "date"): Date | null {
    if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) {
      return null;
    }
    return CalendarDate.create(raw, field).value;
  }
}
