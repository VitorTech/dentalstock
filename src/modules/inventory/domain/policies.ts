/**
 * Políticas de estoque: validade, custo médio, reposição e balanço.
 *
 * O nível de estoque (`isLowStock`, `isOutOfStock`) é do catálogo.
 *
 * Funções puras, sem efeito colateral — testáveis sem banco, HTTP ou mocks, e
 * seguras para uso também na interface.
 */
import { DAY_MS, toCents, toDate, type DateLike } from "@/shared/domain";

/** Antecedência com que uma validade vira alerta na tela. */
export const EXPIRY_WARNING_DAYS = 30;

/** Só o que a regra de validade precisa: aceita entidade ou resposta da API. */
type Expirable = { expiresAt: DateLike | null };

export function isExpired(item: Expirable, now: Date = new Date()): boolean {
  return item.expiresAt !== null && toDate(item.expiresAt).getTime() < now.getTime();
}

/** Vence dentro da janela de alerta (e ainda não venceu). */
export function isExpiringSoon(item: Expirable, now: Date = new Date()): boolean {
  if (item.expiresAt === null || isExpired(item, now)) return false;
  return toDate(item.expiresAt).getTime() - now.getTime() <= EXPIRY_WARNING_DAYS * DAY_MS;
}

/** Vencido ou dentro da janela: é o que a tela sinaliza como "validade". */
export function needsExpiryAttention(item: Expirable, now: Date = new Date()): boolean {
  return isExpired(item, now) || isExpiringSoon(item, now);
}

/** Dias até vencer — negativo quando já venceu. */
export function daysUntilExpiry(item: Expirable, now: Date = new Date()): number | null {
  if (item.expiresAt === null) return null;
  return Math.ceil((toDate(item.expiresAt).getTime() - now.getTime()) / DAY_MS);
}

/**
 * Custo médio ponderado após uma entrada.
 *
 * Preferido ao "último preço pago" porque o estoque da clínica é uma mistura:
 * trocar o custo pelo da nota mais recente faria o relatório do mês inteiro
 * saltar por causa de uma compra pequena a preço promocional.
 *
 * Quando não há custo anterior (primeira entrada), o custo da entrada passa a
 * valer integralmente — não há o que ponderar.
 */
export function weightedAverageCost(input: {
  currentStock: number;
  currentCost: number | null;
  incomingQuantity: number;
  incomingCost: number;
}): number {
  const { currentStock, currentCost, incomingQuantity, incomingCost } = input;
  if (currentCost === null || currentStock <= 0) return toCents(incomingCost);

  const total = currentStock + incomingQuantity;
  if (total <= 0) return toCents(incomingCost);

  return toCents((currentStock * currentCost + incomingQuantity * incomingCost) / total);
}

