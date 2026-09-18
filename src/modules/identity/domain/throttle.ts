/**
 * Login attempt limits (OWASP A07 — identification and authentication
 * failures).
 *
 * The counting mechanics live in `shared/domain/throttle`; what belongs to
 * identity are the thresholds and the wording shown at login.
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
import type { ThrottleLimits } from "@/shared/domain";

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

export const LOGIN_ACCOUNT_LIMITS: ThrottleLimits = {
  windowMs: LOGIN_WINDOW_MS,
  blockMs: LOGIN_BLOCK_MS,
  maxAttempts: LOGIN_MAX_FAILURES_PER_ACCOUNT,
};

export const LOGIN_IP_LIMITS: ThrottleLimits = {
  windowMs: LOGIN_WINDOW_MS,
  blockMs: LOGIN_BLOCK_MS,
  maxAttempts: LOGIN_MAX_FAILURES_PER_IP,
};

/** Key of the counter that protects one account, whatever the origin. */
export const loginAccountKey = (email: string) => `login:user:${email}`;

/** Key of the counter that protects one origin, whatever the account. */
export const loginOriginKey = (ipAddress: string) => `login:ip:${ipAddress}`;
