/**
 * Inventory policies: expiry and weighted average cost.
 *
 * Stock level (`isLowStock`, `isOutOfStock`) belongs to the catalog.
 *
 * Pure functions, no side effects — testable without a database, HTTP or
 * mocks, and safe to use on the client as well.
 */
import { DAY_MS, toCents, toDate, type DateLike } from "@/shared/domain";

/** How far ahead an expiry date turns into an on-screen warning. */
export const EXPIRY_WARNING_DAYS = 30;

/** Only what the expiry rule needs: accepts an entity or an API response. */
type Expirable = { expiresAt: DateLike | null };

export function isExpired(item: Expirable, now: Date = new Date()): boolean {
  return item.expiresAt !== null && toDate(item.expiresAt).getTime() < now.getTime();
}

/** Expires within the warning window (and has not expired yet). */
export function isExpiringSoon(item: Expirable, now: Date = new Date()): boolean {
  if (item.expiresAt === null || isExpired(item, now)) return false;
  return toDate(item.expiresAt).getTime() - now.getTime() <= EXPIRY_WARNING_DAYS * DAY_MS;
}

/** Expired or inside the window: what the screen flags as "expiry". */
export function needsExpiryAttention(item: Expirable, now: Date = new Date()): boolean {
  return isExpired(item, now) || isExpiringSoon(item, now);
}

/** Days until expiry — negative once it has expired. */
export function daysUntilExpiry(item: Expirable, now: Date = new Date()): number | null {
  if (item.expiresAt === null) return null;
  return Math.ceil((toDate(item.expiresAt).getTime() - now.getTime()) / DAY_MS);
}

/**
 * Weighted average cost after an entry.
 *
 * Preferred over "last price paid" because clinic stock is a blend: swapping
 * the cost for the most recent invoice would make a whole month's report jump
 * because of one small purchase at a promotional price.
 *
 * When there is no previous cost (first entry), the incoming cost applies in
 * full — there is nothing to weight against.
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

