import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/domain";
import { HexColor, Slug } from "./value-objects";

describe("Slug", () => {
  it("remove acentos e normaliza separadores", () => {
    expect(Slug.fromName("Clínica São José").value).toBe("clinica-sao-jose");
  });

  it("neutraliza caracteres perigosos de caminho", () => {
    expect(Slug.fromName("../etc/passwd").value).toBe("etc-passwd");
    expect(Slug.fromName("a/b?c=1").value).toBe("a-b-c-1");
  });

  it("nunca devolve vazio", () => {
    expect(Slug.fromName("🦷🦷").value).toBe("clinica");
    expect(Slug.fromName("").value).toBe("clinica");
  });

  it("numera mantendo o limite de tamanho", () => {
    const base = Slug.fromName("a".repeat(60));
    const numerado = base.withSuffix(12);
    expect(numerado.value.endsWith("-12")).toBe(true);
    expect(numerado.value.length).toBeLessThanOrEqual(40);
  });
});

describe("HexColor", () => {
  it("aceita #RRGGBB e normaliza para minúsculas", () => {
    expect(HexColor.create("#0071E3").value).toBe("#0071e3");
  });

  it("recusa qualquer coisa fora do formato — é injeção de CSS", () => {
    expect(() => HexColor.create("red")).toThrow(ValidationError);
    expect(() => HexColor.create("#fff")).toThrow(ValidationError);
    expect(() => HexColor.create("#0071e3; background: url(x)")).toThrow(ValidationError);
  });
});
