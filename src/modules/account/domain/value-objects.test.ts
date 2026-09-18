import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/domain";
import { HexColor, Slug } from "./value-objects";

describe("Slug", () => {
  it("strips accents and normalizes separators", () => {
    expect(Slug.fromName("Clínica São José").value).toBe("clinica-sao-jose");
  });

  it("neutralizes dangerous path characters", () => {
    expect(Slug.fromName("../etc/passwd").value).toBe("etc-passwd");
    expect(Slug.fromName("a/b?c=1").value).toBe("a-b-c-1");
  });

  it("never returns empty", () => {
    expect(Slug.fromName("🦷🦷").value).toBe("clinica");
    expect(Slug.fromName("").value).toBe("clinica");
  });

  it("numbers the variant while keeping the length limit", () => {
    const base = Slug.fromName("a".repeat(60));
    const numerado = base.withSuffix(12);
    expect(numerado.value.endsWith("-12")).toBe(true);
    expect(numerado.value.length).toBeLessThanOrEqual(40);
  });
});

describe("HexColor", () => {
  it("accepts #RRGGBB and normalizes to lowercase", () => {
    expect(HexColor.create("#0071E3").value).toBe("#0071e3");
  });

  it("rejects anything outside the format — that is CSS injection", () => {
    expect(() => HexColor.create("red")).toThrow(ValidationError);
    expect(() => HexColor.create("#fff")).toThrow(ValidationError);
    expect(() => HexColor.create("#0071e3; background: url(x)")).toThrow(ValidationError);
  });
});
