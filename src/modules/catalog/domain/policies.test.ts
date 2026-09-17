import { describe, expect, it } from "vitest";
import { isLowStock, isOutOfStock } from "./policies";

describe("nível de estoque", () => {
  it("estoque baixo inclui o limite, não só abaixo dele", () => {
    expect(isLowStock({ stock: 5, minStock: 5 })).toBe(true);
    expect(isLowStock({ stock: 6, minStock: 5 })).toBe(false);
  });

  it("sem estoque é zero ou negativo", () => {
    expect(isOutOfStock({ stock: 0 })).toBe(true);
    expect(isOutOfStock({ stock: 0.5 })).toBe(false);
  });
});
