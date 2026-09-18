/**
 * Generic attempt-counting policy, shared by everything that needs to slow an
 * abusive caller down (OWASP A04 — insecure design, A07 — authentication
 * failures).
 *
 * Pure functions over a counter: the decision to block depends on no database,
 * no system clock and no HTTP, which makes it directly testable. Each caller
 * brings its own limits — login is stricter per account than the write routes
 * are per address.
 */

/** Persisted counter for one key. */
export interface AttemptState {
  failures: number;
  /** Start of the current window. */
  firstFailureAt: Date;
  blockedUntil: Date | null;
}

/** How a caller configures the policy. */
export interface ThrottleLimits {
  /** Window in which attempts accumulate. An old, isolated one does not count. */
  windowMs: number;
  /** How long the key stays blocked once the limit is reached. */
  blockMs: number;
  /** Attempts tolerated before blocking. */
  maxAttempts: number;
}

/**
 * Seconds left until release; `0` when not blocked.
 *
 * Rounds up so it never promises release earlier than it happens.
 */
export function secondsUntilUnblocked(state: AttemptState | null, now: Date): number {
  if (!state?.blockedUntil) return 0;
  const remaining = state.blockedUntil.getTime() - now.getTime();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Next state after one counted attempt.
 *
 * An expired window restarts the count: someone who mistyped a password once
 * yesterday does not carry it forever.
 */
export function afterAttempt(
  state: AttemptState | null,
  now: Date,
  limits: ThrottleLimits
): AttemptState {
  // Already blocked: the counter stops. Adding here would keep the deadline
  // permanently ahead of the clock, and whoever kept trying during the block
  // would never get out of it — including the legitimate user.
  if (secondsUntilUnblocked(state, now) > 0) return state as AttemptState;

  const expired =
    state === null || now.getTime() - state.firstFailureAt.getTime() > limits.windowMs;

  const failures = expired ? 1 : state.failures + 1;
  const blocked = failures >= limits.maxAttempts;

  return {
    failures,
    firstFailureAt: expired ? now : state.firstFailureAt,
    blockedUntil: blocked ? new Date(now.getTime() + limits.blockMs) : null,
  };
}

/** Message that says how long to wait, without revealing which key was hit. */
export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Muitas tentativas. Tente novamente em ${minutes} ${
    minutes === 1 ? "minuto" : "minutos"
  }.`;
}
