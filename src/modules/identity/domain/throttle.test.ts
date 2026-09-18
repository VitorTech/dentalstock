import { describe, expect, it } from "vitest";
import {
  LOGIN_BLOCK_MS,
  LOGIN_WINDOW_MS,
  afterFailedAttempt,
  secondsUntilUnblocked,
  tooManyAttemptsMessage,
} from "./throttle";

const NOW = new Date("2026-09-17T10:00:00.000Z");
const LIMIT = 3;

describe("login attempt limit", () => {
  it("the first failure opens the window without blocking", () => {
    const state = afterFailedAttempt(null, NOW, LIMIT);

    expect(state).toEqual({ failures: 1, firstFailureAt: NOW, blockedUntil: null });
    expect(secondsUntilUnblocked(state, NOW)).toBe(0);
  });

  it("blocks on reaching the limit, not after it", () => {
    let state = afterFailedAttempt(null, NOW, LIMIT);
    state = afterFailedAttempt(state, NOW, LIMIT);
    expect(state.blockedUntil).toBeNull();

    state = afterFailedAttempt(state, NOW, LIMIT);
    expect(state.failures).toBe(LIMIT);
    expect(secondsUntilUnblocked(state, NOW)).toBe(LOGIN_BLOCK_MS / 1000);
  });

  it("an old failure does not count: the window restarts", () => {
    const antigo = afterFailedAttempt(null, NOW, LIMIT);
    const depois = new Date(NOW.getTime() + LOGIN_WINDOW_MS + 1);

    const state = afterFailedAttempt(antigo, depois, LIMIT);

    expect(state).toEqual({ failures: 1, firstFailureAt: depois, blockedUntil: null });
  });

  it("the block clears itself once the deadline passes", () => {
    let state = afterFailedAttempt(null, NOW, 1);
    const durante = new Date(NOW.getTime() + LOGIN_BLOCK_MS - 1000);
    const depois = new Date(NOW.getTime() + LOGIN_BLOCK_MS + 1000);

    expect(secondsUntilUnblocked(state, durante)).toBe(1);
    expect(secondsUntilUnblocked(state, depois)).toBe(0);

    // And a new failure during the block does not extend the original deadline —
    // otherwise an attacker would keep the legitimate user locked out forever.
    state = afterFailedAttempt(state, durante, 1);
    expect(secondsUntilUnblocked(state, depois)).toBe(0);
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
