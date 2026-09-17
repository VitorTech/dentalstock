/**
 * Value Objects primitivos, usados por mais de um módulo.
 *
 * Cada tipo garante suas próprias invariantes no construtor: se existe uma
 * instância, ela é válida. Isso concentra a validação (OWASP A03 — validação
 * por allowlist na fronteira do domínio) em vez de espalhá-la pelas rotas.
 *
 * Value Objects específicos de um contexto moram no domínio do próprio módulo.
 */
import { ValidationError } from "./errors";

/** E-mail normalizado (minúsculas, sem espaços). */
export class Email {
  private constructor(readonly value: string) {}

  // Verificação deliberadamente conservadora: um único "@", partes não vazias,
  // domínio com ponto e sem espaços. Não tenta cobrir a RFC 5322 inteira —
  // e-mail só se confirma de fato enviando mensagem.
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX = 254; // limite prático de e-mail

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

/** Telefone brasileiro (10 ou 11 dígitos, com DDD). */
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
    // Aceita 12–13 dígitos para números já com o código do país (55).
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

/** Texto curto obrigatório (nomes, títulos), com limite contra abuso. */
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
   * Texto opcional: ausência, valor não textual ou string vazia viram `null`;
   * texto presente passa pelas mesmas regras de `create`, com limite `max`.
   *
   * Substitui três helpers privados que existiam com nomes diferentes
   * (`optionalText`, `optionalNote` e variações) e a mesma regra.
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

/** Quantidade positiva e finita (estoque, consumo). */
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

/** Valor de estoque: aceita zero, recusa negativo. */
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
 * Valor monetário em reais.
 *
 * Arredonda para centavos na fronteira: custo entra por formulário e por
 * cálculo de média ponderada, e deixar `0.1 + 0.2` circular pelo sistema faria
 * o relatório fechar com sobra de fração de centavo.
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

  /** Aceita ausência: campo de custo é opcional em todo o sistema. */
  static optional(raw: unknown, field = "unitCost"): number | null {
    if (raw === undefined || raw === null || raw === "") return null;
    return Money.create(raw, field).value;
  }
}

/**
 * Data de calendário vinda de um `<input type="date">` (AAAA-MM-DD).
 *
 * Fixa o horário em meio-dia UTC de propósito: `new Date("2026-08-02")` é
 * meia-noite UTC, que no fuso do Brasil volta para o dia 1º — uma validade
 * apareceria na tela um dia antes da que foi digitada.
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
