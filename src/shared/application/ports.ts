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
