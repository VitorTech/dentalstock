import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { CalendarDate, Email, Money, NonEmptyText, PhoneNumber, Quantity, StockLevel } from "./value-objects";

describe("Email", () => {
  it("normaliza para minúsculas e remove espaços", () => {
    expect(Email.create("  Contato@Clinica.COM  ").value).toBe("contato@clinica.com");
  });

  it.each([
    ["sem arroba", "clinica.com"],
    ["domínio sem ponto", "contato@clinica"],
    ["com espaço no meio", "con tato@clinica.com"],
    ["dois arrobas", "a@b@c.com"],
    ["vazio", ""],
  ])("recusa e-mail %s", (_caso, entrada) => {
    expect(() => Email.create(entrada)).toThrow(ValidationError);
  });

  it("recusa valor que não é string", () => {
    expect(() => Email.create(42)).toThrow(ValidationError);
    expect(() => Email.create(null)).toThrow(ValidationError);
  });

  it("recusa e-mail acima do limite prático de 254 caracteres", () => {
    const longo = `${"a".repeat(250)}@b.com`;
    expect(() => Email.create(longo)).toThrow(ValidationError);
  });
});

describe("PhoneNumber", () => {
  it("aceita telefone com DDD, fixo e celular", () => {
    expect(PhoneNumber.create("(11) 3456-7890").digits).toBe("1134567890");
    expect(PhoneNumber.create("11987654321").digits).toBe("11987654321");
  });

  it("remove o código do país quando presente", () => {
    expect(PhoneNumber.create("+55 11 98765-4321").digits).toBe("11987654321");
  });

  it("preserva o formato digitado para exibição", () => {
    expect(PhoneNumber.create("(11) 98765-4321").formatted).toBe("(11) 98765-4321");
  });

  it("recusa número sem DDD ou longo demais", () => {
    expect(() => PhoneNumber.create("987654321")).toThrow(ValidationError);
    expect(() => PhoneNumber.create("119876543210")).toThrow(ValidationError);
  });
});

describe("Quantity", () => {
  it("aceita valores positivos, inclusive fracionários", () => {
    expect(Quantity.create(1).value).toBe(1);
    expect(Quantity.create(0.5).value).toBe(0.5);
  });

  it("recusa zero e negativos", () => {
    expect(() => Quantity.create(0)).toThrow(ValidationError);
    expect(() => Quantity.create(-1)).toThrow(ValidationError);
  });

  it("recusa não-número, NaN e Infinity", () => {
    expect(() => Quantity.create("2")).toThrow(ValidationError);
    expect(() => Quantity.create(NaN)).toThrow(ValidationError);
    expect(() => Quantity.create(Infinity)).toThrow(ValidationError);
  });

  it("recusa acima do teto", () => {
    expect(() => Quantity.create(1_000_001)).toThrow(ValidationError);
  });
});

describe("StockLevel", () => {
  it("aceita zero — diferente de Quantity", () => {
    expect(StockLevel.create(0).value).toBe(0);
  });

  it("recusa negativo", () => {
    expect(() => StockLevel.create(-0.1)).toThrow(ValidationError);
  });
});

describe("Money", () => {
  it("arredonda para centavos na fronteira", () => {
    expect(Money.create(10.005).value).toBe(10.01);
    expect(Money.create(0.1 + 0.2).value).toBe(0.3);
  });

  it("aceita zero e recusa negativo", () => {
    expect(Money.create(0).value).toBe(0);
    expect(() => Money.create(-1)).toThrow(ValidationError);
  });

  it("trata ausência como null no caminho opcional", () => {
    expect(Money.optional(undefined)).toBeNull();
    expect(Money.optional(null)).toBeNull();
    expect(Money.optional("")).toBeNull();
    expect(Money.optional(4.5)).toBe(4.5);
  });
});

describe("CalendarDate", () => {
  it("ancora ao meio-dia UTC para o fuso do Brasil não recuar o dia", () => {
    const data = CalendarDate.create("2026-08-02").value;
    expect(data.toISOString()).toBe("2026-08-02T12:00:00.000Z");
    // O ponto do ancoramento: em UTC-3 o dia exibido continua sendo o 2.
    expect(data.getTime()).toBeGreaterThan(new Date("2026-08-02T00:00:00Z").getTime());
  });

  it("recusa formato diferente de AAAA-MM-DD", () => {
    expect(() => CalendarDate.create("02/08/2026")).toThrow(ValidationError);
    expect(() => CalendarDate.create("2026-8-2")).toThrow(ValidationError);
  });

  it("trata vazio como ausência no caminho opcional", () => {
    expect(CalendarDate.optional("")).toBeNull();
    expect(CalendarDate.optional(undefined)).toBeNull();
  });
});

describe("NonEmptyText", () => {
  it("apara e respeita os limites informados", () => {
    expect(NonEmptyText.create("  Resina  ", "nome").value).toBe("Resina");
    expect(() => NonEmptyText.create("a", "nome")).toThrow(ValidationError);
    expect(NonEmptyText.create("a", "nome", { min: 1 }).value).toBe("a");
  });

  it("recusa acima do máximo", () => {
    expect(() => NonEmptyText.create("a".repeat(201), "nome")).toThrow(ValidationError);
  });
  it("no caminho opcional, vazio e não-texto viram ausência", () => {
    expect(NonEmptyText.optional("   ", "observação")).toBeNull();
    expect(NonEmptyText.optional(undefined, "observação")).toBeNull();
    expect(NonEmptyText.optional(42, "observação")).toBeNull();
  });

  it("no caminho opcional, apara e aceita um único caractere", () => {
    expect(NonEmptyText.optional("  x  ", "observação")).toBe("x");
  });

  it("no caminho opcional, ainda recusa acima do máximo informado", () => {
    expect(() => NonEmptyText.optional("a".repeat(301), "observação", 300)).toThrow(ValidationError);
    expect(NonEmptyText.optional("a".repeat(300), "observação", 300)).toHaveLength(300);
  });
});
