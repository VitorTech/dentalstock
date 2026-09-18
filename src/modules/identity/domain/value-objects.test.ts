import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/domain";
import { PlainPassword } from "./value-objects";

describe("PlainPassword", () => {
  it("requires at least 8 characters when SETTING a password", () => {
    expect(() => PlainPassword.create("1234567")).toThrow(ValidationError);
    expect(PlainPassword.create("12345678").value).toBe("12345678");
  });

  it("does NOT apply the strength policy when checking at login", () => {
    // Deliberate rule: enforcing the minimum here would lock out whoever set a
    // password before the policy, and the message would leak it at login.
    expect(PlainPassword.forAuthentication("123").value).toBe("123");
  });

  it("rejects an empty password on both paths", () => {
    expect(() => PlainPassword.create("")).toThrow(ValidationError);
    expect(() => PlainPassword.forAuthentication("")).toThrow(ValidationError);
  });

  it("keeps the length cap at login too (DoS by hashing)", () => {
    const enorme = "a".repeat(129);
    expect(() => PlainPassword.create(enorme)).toThrow(ValidationError);
    expect(() => PlainPassword.forAuthentication(enorme)).toThrow(ValidationError);
  });

  it("never serializes the value", () => {
    const senha = PlainPassword.create("segredo123");
    expect(JSON.stringify({ senha })).not.toContain("segredo123");
    expect(String(senha)).toBe("[REDACTED]");
  });
});
