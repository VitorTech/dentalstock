import type { AttemptState } from "@/shared/domain";

/**
 * Shared technical ports.
 *
 * The clock and secret generation are injectable so that time-based rules and
 * identifiers are deterministic in tests.
 */

/** Injectable clock — makes time-based rules testable. */
export interface Clock {
  now(): Date;
}

/** Random secret generation (session identifiers, nonces). */
export interface SecretGenerator {
  token(bytes?: number): string;
}

/**
 * Persistence of attempt counters.
 *
 * A port of its own, separate from any aggregate: counters exist for keys that
 * have no record behind them — an e-mail nobody registered, an address nobody
 * knows. The implementation must be shared by every application instance and
 * survive restarts; an in-memory counter resets on each deploy, exactly when a
 * slow attack would benefit.
 */
export interface ThrottleRepository {
  find(key: string): Promise<AttemptState | null>;
  save(key: string, state: AttemptState): Promise<void>;
  /** Drops the counter (a successful attempt). */
  clear(key: string): Promise<void>;
}
