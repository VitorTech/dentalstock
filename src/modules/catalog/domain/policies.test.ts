import { describe, expect, it } from "vitest";
import { isLowStock, isOutOfStock } from "./policies";

describe("stock level", () => {
  it("low stock includes the threshold, not only below it", () => {
    expect(isLowStock({ stock: 5, minStock: 5 })).toBe(true);
    expect(isLowStock({ stock: 6, minStock: 5 })).toBe(false);
  });

  it("out of stock means zero or negative", () => {
    expect(isOutOfStock({ stock: 0 })).toBe(true);
    expect(isOutOfStock({ stock: 0.5 })).toBe(false);
  });
});
