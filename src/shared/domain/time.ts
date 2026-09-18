/** Time constants shared by the domain policies. */

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A date as it reaches a policy: `Date` on the server, ISO text on the client
 * (JSON has no date type). Accepting both lets the same rule run on both sides
 * without conversions scattered across the screens.
 */
export type DateLike = Date | string;

export const toDate = (value: DateLike): Date =>
  value instanceof Date ? value : new Date(value);
