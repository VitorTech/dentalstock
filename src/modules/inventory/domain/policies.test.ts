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

const DIA = 24 * 60 * 60 * 1000;

const AGORA = new Date("2026-09-14T12:00:00.000Z");

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

describe("validade", () => {
  it("aceita a data como texto ISO, como chega à interface via JSON", () => {
    const iso = { expiresAt: new Date(AGORA.getTime() + 10 * DIA).toISOString() };
    expect(isExpiringSoon(iso, AGORA)).toBe(true);
    expect(daysUntilExpiry(iso, AGORA)).toBe(10);
  });

  it("atenção à validade cobre vencido e prestes a vencer", () => {
    expect(needsExpiryAttention({ expiresAt: new Date(AGORA.getTime() - DIA) }, AGORA)).toBe(true);
    expect(needsExpiryAttention({ expiresAt: new Date(AGORA.getTime() + 5 * DIA) }, AGORA)).toBe(true);
    expect(needsExpiryAttention({ expiresAt: null }, AGORA)).toBe(false);
  });

  it("material sem validade nunca alerta", () => {
    const m = material({ expiresAt: null });
    expect(isExpired(m, AGORA)).toBe(false);
    expect(isExpiringSoon(m, AGORA)).toBe(false);
    expect(daysUntilExpiry(m, AGORA)).toBeNull();
  });

  it("vencido e 'vence em breve' são estados exclusivos", () => {
    const vencido = material({ expiresAt: new Date(AGORA.getTime() - DIA) });
    expect(isExpired(vencido, AGORA)).toBe(true);
    expect(isExpiringSoon(vencido, AGORA)).toBe(false);

    const breve = material({ expiresAt: new Date(AGORA.getTime() + 10 * DIA) });
    expect(isExpired(breve, AGORA)).toBe(false);
    expect(isExpiringSoon(breve, AGORA)).toBe(true);
  });

  it("fora da janela de alerta não avisa", () => {
    const longe = material({
      expiresAt: new Date(AGORA.getTime() + (EXPIRY_WARNING_DAYS + 1) * DIA),
    });
    expect(isExpiringSoon(longe, AGORA)).toBe(false);
  });

  it("dias até vencer é negativo para o que já venceu", () => {
    const m = material({ expiresAt: new Date(AGORA.getTime() - 3 * DIA) });
    expect(daysUntilExpiry(m, AGORA)).toBe(-3);
  });
});

describe("weightedAverageCost", () => {
  it("sem custo anterior, adota integralmente o custo da entrada", () => {
    expect(
      weightedAverageCost({
        currentStock: 40,
        currentCost: null,
        incomingQuantity: 25,
        incomingCost: 4.5,
      })
    ).toBe(4.5);
  });

  it("pondera pelo saldo existente", () => {
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

  it("estoque zerado adota o custo novo, sem dividir por zero", () => {
    expect(
      weightedAverageCost({
        currentStock: 0,
        currentCost: 8,
        incomingQuantity: 5,
        incomingCost: 2,
      })
    ).toBe(2);
  });

  it("estoque negativo não produz custo negativo", () => {
    expect(
      weightedAverageCost({
        currentStock: -5,
        currentCost: 8,
        incomingQuantity: 5,
        incomingCost: 2,
      })
    ).toBe(2);
  });

  it("arredonda o resultado para centavos", () => {
    const r = weightedAverageCost({
      currentStock: 3,
      currentCost: 1.11,
      incomingQuantity: 1,
      incomingCost: 2.22,
    });
    expect(r).toBe(toCents(r));
  });
});

