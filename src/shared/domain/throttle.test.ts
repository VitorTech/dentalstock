import { describe, expect, it } from "vitest";
import {
  afterAttempt,
  secondsUntilUnblocked,
  type ThrottleLimits,
  tooManyAttemptsMessage,
} from "./throttle";

const NOW = new Date("2026-09-17T10:00:00.000Z");
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

const limits = (maxAttempts: number): ThrottleLimits => ({
  windowMs: WINDOW_MS,
  blockMs: BLOCK_MS,
  maxAttempts,
});

describe("attempt limiting", () => {
  it("the first failure opens the window without blocking", () => {
    const state = afterAttempt(null, NOW, limits(3));

    expect(state).toEqual({ failures: 1, firstFailureAt: NOW, blockedUntil: null });
    expect(secondsUntilUnblocked(state, NOW)).toBe(0);
  });

  it("blocks on reaching the limit, not after it", () => {
    let state = afterAttempt(null, NOW, limits(3));
    state = afterAttempt(state, NOW, limits(3));
    expect(state.blockedUntil).toBeNull();

    state = afterAttempt(state, NOW, limits(3));
    expect(state.failures).toBe(3);
    expect(secondsUntilUnblocked(state, NOW)).toBe(BLOCK_MS / 1000);
  });

  it("an old failure does not count: the window restarts", () => {
    const old = afterAttempt(null, NOW, limits(3));
    const later = new Date(NOW.getTime() + WINDOW_MS + 1);

    const state = afterAttempt(old, later, limits(3));

    expect(state).toEqual({ failures: 1, firstFailureAt: later, blockedUntil: null });
  });

  it("the block clears itself once the deadline passes", () => {
    let state = afterAttempt(null, NOW, limits(1));
    const during = new Date(NOW.getTime() + BLOCK_MS - 1000);
    const later = new Date(NOW.getTime() + BLOCK_MS + 1000);

    expect(secondsUntilUnblocked(state, during)).toBe(1);
    expect(secondsUntilUnblocked(state, later)).toBe(0);

    // And a new failure during the block does not extend the original deadline —
    // otherwise an attacker would keep the legitimate user locked out forever.
    state = afterAttempt(state, during, limits(1));
    expect(secondsUntilUnblocked(state, later)).toBe(0);
  });

  it("with no counter, nothing blocks", () => {
    expect(secondsUntilUnblocked(null, NOW)).toBe(0);
    expect(secondsUntilUnblocked({ failures: 9, firstFailureAt: NOW, blockedUntil: null }, NOW)).toBe(0);
  });

  it("the message says how long to wait, in whole minutes", () => {
    expect(tooManyAttemptsMessage(60)).toContain("1 minuto");
    expect(tooManyAttemptsMessage(61)).toContain("2 minutos");
  });
});
