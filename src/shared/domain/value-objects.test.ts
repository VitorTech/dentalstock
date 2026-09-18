import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { CalendarDate, Email, Money, NonEmptyText, PhoneNumber, Quantity, StockLevel } from "./value-objects";

describe("Email", () => {
  it("normalizes to lowercase and trims spaces", () => {
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

  it("rejects a value that is not a string", () => {
    expect(() => Email.create(42)).toThrow(ValidationError);
    expect(() => Email.create(null)).toThrow(ValidationError);
  });

  it("rejects an e-mail above the practical 254-character limit", () => {
    const longo = `${"a".repeat(250)}@b.com`;
    expect(() => Email.create(longo)).toThrow(ValidationError);
  });
});

describe("PhoneNumber", () => {
  it("accepts landline and mobile numbers with an area code", () => {
    expect(PhoneNumber.create("(11) 3456-7890").digits).toBe("1134567890");
    expect(PhoneNumber.create("11987654321").digits).toBe("11987654321");
  });

  it("strips the country code when present", () => {
    expect(PhoneNumber.create("+55 11 98765-4321").digits).toBe("11987654321");
  });

  it("keeps the typed format for display", () => {
    expect(PhoneNumber.create("(11) 98765-4321").formatted).toBe("(11) 98765-4321");
  });

  it("rejects a number without an area code or too long", () => {
    expect(() => PhoneNumber.create("987654321")).toThrow(ValidationError);
    expect(() => PhoneNumber.create("119876543210")).toThrow(ValidationError);
  });
});

describe("Quantity", () => {
  it("accepts positive values, fractions included", () => {
    expect(Quantity.create(1).value).toBe(1);
    expect(Quantity.create(0.5).value).toBe(0.5);
  });

  it("rejects zero and negatives", () => {
    expect(() => Quantity.create(0)).toThrow(ValidationError);
    expect(() => Quantity.create(-1)).toThrow(ValidationError);
  });

  it("rejects non-numbers, NaN and Infinity", () => {
    expect(() => Quantity.create("2")).toThrow(ValidationError);
    expect(() => Quantity.create(NaN)).toThrow(ValidationError);
    expect(() => Quantity.create(Infinity)).toThrow(ValidationError);
  });

  it("rejects values above the cap", () => {
    expect(() => Quantity.create(1_000_001)).toThrow(ValidationError);
  });
});

describe("StockLevel", () => {
  it("accepts zero — unlike Quantity", () => {
    expect(StockLevel.create(0).value).toBe(0);
  });

  it("rejects negatives", () => {
    expect(() => StockLevel.create(-0.1)).toThrow(ValidationError);
  });
});

describe("Money", () => {
  it("rounds to cents at the boundary", () => {
    expect(Money.create(10.005).value).toBe(10.01);
    expect(Money.create(0.1 + 0.2).value).toBe(0.3);
  });

  it("accepts zero and rejects negatives", () => {
    expect(Money.create(0).value).toBe(0);
    expect(() => Money.create(-1)).toThrow(ValidationError);
  });

  it("treats absence as null on the optional path", () => {
    expect(Money.optional(undefined)).toBeNull();
    expect(Money.optional(null)).toBeNull();
    expect(Money.optional("")).toBeNull();
    expect(Money.optional(4.5)).toBe(4.5);
  });
});

describe("CalendarDate", () => {
  it("anchors at noon UTC so Brazil's timezone does not roll the day back", () => {
    const data = CalendarDate.create("2026-08-02").value;
    expect(data.toISOString()).toBe("2026-08-02T12:00:00.000Z");
    // The point of anchoring: in UTC-3 the displayed day is still the 2nd.
    expect(data.getTime()).toBeGreaterThan(new Date("2026-08-02T00:00:00Z").getTime());
  });

  it("rejects any format other than YYYY-MM-DD", () => {
    expect(() => CalendarDate.create("02/08/2026")).toThrow(ValidationError);
    expect(() => CalendarDate.create("2026-8-2")).toThrow(ValidationError);
  });

  it("treats empty as absence on the optional path", () => {
    expect(CalendarDate.optional("")).toBeNull();
    expect(CalendarDate.optional(undefined)).toBeNull();
  });
});

describe("NonEmptyText", () => {
  it("trims and respects the given bounds", () => {
    expect(NonEmptyText.create("  Resina  ", "nome").value).toBe("Resina");
    expect(() => NonEmptyText.create("a", "nome")).toThrow(ValidationError);
    expect(NonEmptyText.create("a", "nome", { min: 1 }).value).toBe("a");
  });

  it("rejects text above the maximum", () => {
    expect(() => NonEmptyText.create("a".repeat(201), "nome")).toThrow(ValidationError);
  });
  it("on the optional path, empty and non-text become absence", () => {
    expect(NonEmptyText.optional("   ", "observação")).toBeNull();
    expect(NonEmptyText.optional(undefined, "observação")).toBeNull();
    expect(NonEmptyText.optional(42, "observação")).toBeNull();
  });

  it("on the optional path, trims and accepts a single character", () => {
    expect(NonEmptyText.optional("  x  ", "observação")).toBe("x");
  });

  it("on the optional path, still rejects above the given maximum", () => {
    expect(() => NonEmptyText.optional("a".repeat(301), "observação", 300)).toThrow(ValidationError);
    expect(NonEmptyText.optional("a".repeat(300), "observação", 300)).toHaveLength(300);
  });
});
