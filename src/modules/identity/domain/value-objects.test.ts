import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/domain";
import { PlainPassword } from "./value-objects";

describe("PlainPassword", () => {
  it("exige o mínimo de 8 caracteres ao DEFINIR uma senha", () => {
    expect(() => PlainPassword.create("1234567")).toThrow(ValidationError);
    expect(PlainPassword.create("12345678").value).toBe("12345678");
  });

  it("NÃO aplica política de força ao conferir no login", () => {
    // Regra deliberada: exigir o mínimo aqui travaria quem criou a senha antes
    // da política, e a mensagem revelaria a política na tela de login.
    expect(PlainPassword.forAuthentication("123").value).toBe("123");
  });

  it("recusa senha vazia nos dois caminhos", () => {
    expect(() => PlainPassword.create("")).toThrow(ValidationError);
    expect(() => PlainPassword.forAuthentication("")).toThrow(ValidationError);
  });

  it("mantém o teto de tamanho também no login (DoS por hashing)", () => {
    const enorme = "a".repeat(129);
    expect(() => PlainPassword.create(enorme)).toThrow(ValidationError);
    expect(() => PlainPassword.forAuthentication(enorme)).toThrow(ValidationError);
  });

  it("nunca serializa o valor", () => {
    const senha = PlainPassword.create("segredo123");
    expect(JSON.stringify({ senha })).not.toContain("segredo123");
    expect(String(senha)).toBe("[REDACTED]");
  });
});
