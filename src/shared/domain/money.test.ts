import { describe, expect, it } from "vitest";
import { toCents } from "./money";

describe("toCents", () => {
  it("eliminates the floating-point residue", () => {
    expect(toCents(0.1 + 0.2)).toBe(0.3);
    expect(toCents(1 / 3)).toBe(0.33);
  });
});
