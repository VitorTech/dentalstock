import { describe, expect, it } from "vitest";
import type { Material } from "@/modules/catalog/domain";
import { toCents } from "@/shared/domain";
import {
  EXPIRY_WARNING_DAYS,
  daysUntilExpiry,
  isExpired,
  isExpiringSoon,
  needsExpiryAttention,
  weightedAverageCost,
} from "./policies";

const DAY = 24 * 60 * 60 * 1000;

const NOW = new Date("2026-09-14T12:00:00.000Z");

function material(over: Partial<Material> = {}): Material {
  return {
    id: "m1",
    tenantId: "t1",
    name: "Resina Composta",
    unit: "g",
    category: "Restaurador",
    imageUrl: null,
    stock: 10,
    minStock: 0,
    supplierId: null,
    supplier: null,
    unitCost: null,
    expiresAt: null,
    ...over,
  };
}

describe("expiry", () => {
  it("accepts the date as ISO text, the way the client receives it over JSON", () => {
    const iso = { expiresAt: new Date(NOW.getTime() + 10 * DAY).toISOString() };
    expect(isExpiringSoon(iso, NOW)).toBe(true);
    expect(daysUntilExpiry(iso, NOW)).toBe(10);
  });

  it("expiry attention covers both expired and about to expire", () => {
    expect(needsExpiryAttention({ expiresAt: new Date(NOW.getTime() - DAY) }, NOW)).toBe(true);
    expect(needsExpiryAttention({ expiresAt: new Date(NOW.getTime() + 5 * DAY) }, NOW)).toBe(true);
    expect(needsExpiryAttention({ expiresAt: null }, NOW)).toBe(false);
  });

  it("a material without an expiry date never warns", () => {
    const m = material({ expiresAt: null });
    expect(isExpired(m, NOW)).toBe(false);
    expect(isExpiringSoon(m, NOW)).toBe(false);
    expect(daysUntilExpiry(m, NOW)).toBeNull();
  });

  it("expired and 'expiring soon' are exclusive states", () => {
    const vencido = material({ expiresAt: new Date(NOW.getTime() - DAY) });
    expect(isExpired(vencido, NOW)).toBe(true);
    expect(isExpiringSoon(vencido, NOW)).toBe(false);

    const breve = material({ expiresAt: new Date(NOW.getTime() + 10 * DAY) });
    expect(isExpired(breve, NOW)).toBe(false);
    expect(isExpiringSoon(breve, NOW)).toBe(true);
  });

  it("outside the warning window it stays quiet", () => {
    const longe = material({
      expiresAt: new Date(NOW.getTime() + (EXPIRY_WARNING_DAYS + 1) * DAY),
    });
    expect(isExpiringSoon(longe, NOW)).toBe(false);
  });

  it("days until expiry is negative for what already expired", () => {
    const m = material({ expiresAt: new Date(NOW.getTime() - 3 * DAY) });
    expect(daysUntilExpiry(m, NOW)).toBe(-3);
  });
});

describe("weightedAverageCost", () => {
  it("with no previous cost, it adopts the incoming cost in full", () => {
    expect(
      weightedAverageCost({
        currentStock: 40,
        currentCost: null,
        incomingQuantity: 25,
        incomingCost: 4.5,
      })
    ).toBe(4.5);
  });

  it("weights by the existing balance", () => {
    // 10 a R$ 2,00 + 10 a R$ 4,00 → R$ 3,00
    expect(
      weightedAverageCost({
        currentStock: 10,
        currentCost: 2,
        incomingQuantity: 10,
        incomingCost: 4,
      })
    ).toBe(3);
  });

  it("zero stock adopts the new cost, without dividing by zero", () => {
    expect(
      weightedAverageCost({
        currentStock: 0,
        currentCost: 8,
        incomingQuantity: 5,
        incomingCost: 2,
      })
    ).toBe(2);
  });

  it("negative stock does not produce a negative cost", () => {
    expect(
      weightedAverageCost({
        currentStock: -5,
        currentCost: 8,
        incomingQuantity: 5,
        incomingCost: 2,
      })
    ).toBe(2);
  });

  it("rounds the result to cents", () => {
    const r = weightedAverageCost({
      currentStock: 3,
      currentCost: 1.11,
      incomingQuantity: 1,
      incomingCost: 2.22,
    });
    expect(r).toBe(toCents(r));
  });
});

