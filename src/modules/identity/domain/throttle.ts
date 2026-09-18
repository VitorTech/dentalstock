/**
 * Login attempt limiting policy (OWASP A07 — identification and
 * authentication failures).
 *
 * It is a pure function over a counter: the decision to block depends on no
 * database, no system clock and no HTTP, which makes it directly testable.
 *
 * Two keys are counted in parallel, because they stop different attacks:
 *
 *  - per ACCOUNT: blocks brute force against one user's password, even when
 *    the attacker rotates IPs on every attempt;
 *  - per ORIGIN (IP): blocks password spraying across many accounts, where no
 *    single account ever reaches its own limit.
 *
 * The two limits differ on purpose. The account one is the delicate one: too
 * low a threshold turns the mechanism into a denial of service against the
 * legitimate user — an attacker only has to fail on purpose to lock the
 * clinic's front desk out. Hence a short block that clears itself, and a
 * counter that resets on the first success, instead of requiring an admin.
 */

/** Window in which failures accumulate. An old, isolated failure does not count. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** How long access stays blocked once the limit is hit. */
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;

/** Failures tolerated for the same account before blocking. */
export const LOGIN_MAX_FAILURES_PER_ACCOUNT = 10;

/**
 * Failures tolerated for the same IP. Higher than the account limit because a
 * whole clinic usually shares one address.
 */
export const LOGIN_MAX_FAILURES_PER_IP = 30;

/** Persisted counter for one key (account or IP). */
export interface LoginAttemptState {
  failures: number;
  /** Start of the current window. */
  firstFailureAt: Date;
  blockedUntil: Date | null;
}

/**
 * Seconds left until release; `0` when not blocked.
 *
 * Rounds up so it never promises release earlier than it happens.
 */
export function secondsUntilUnblocked(
  state: LoginAttemptState | null,
  now: Date
): number {
  if (!state?.blockedUntil) return 0;
  const remaining = state.blockedUntil.getTime() - now.getTime();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Next state after a failed attempt.
 *
 * An expired window restarts the count: someone who mistyped a password once
 * yesterday does not carry it forever.
 */
export function afterFailedAttempt(
  state: LoginAttemptState | null,
  now: Date,
  maxFailures: number
): LoginAttemptState {
  // Already blocked: the counter stops. Adding here would keep the deadline
  // permanently ahead of the clock, and whoever mistyped during the block
  // would never get out of it — including the legitimate user retrying.
  if (secondsUntilUnblocked(state, now) > 0) return state as LoginAttemptState;

  const expired =
    state === null || now.getTime() - state.firstFailureAt.getTime() > LOGIN_WINDOW_MS;

  const failures = expired ? 1 : state.failures + 1;
  const blocked = failures >= maxFailures;

  return {
    failures,
    firstFailureAt: expired ? now : state.firstFailureAt,
    blockedUntil: blocked ? new Date(now.getTime() + LOGIN_BLOCK_MS) : null,
  };
}

/** One message for either key: it never reveals whether it was account or IP. */
export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Muitas tentativas de login. Tente novamente em ${minutes} ${
    minutes === 1 ? "minuto" : "minutos"
  }.`;
}
