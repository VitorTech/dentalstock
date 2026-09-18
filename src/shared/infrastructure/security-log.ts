import "server-only";

/**
 * Security event log (OWASP A09 — logging and monitoring failures).
 *
 * One JSON line per event, on stdout: that is what a container platform
 * collects, and what a log pipeline can filter on without parsing prose.
 *
 * What is NOT logged is as deliberate as what is: no password, no token, no
 * cookie, no request body. A log that carries credentials turns an incident
 * into a second incident. Identifiers (user id, e-mail typed at login, IP) are
 * kept because without them a failed-login series cannot be investigated.
 */
export type SecurityEvent =
  | "login.failed"
  | "login.blocked"
  | "access.denied"
  | "rate_limit.blocked"
  | "csrf.rejected";

export function logSecurityEvent(event: {
  type: SecurityEvent;
  /** Route that produced the event. */
  path: string;
  method: string;
  /** Origin address, when the proxy reported one. */
  ip: string | null;
  /** Authenticated actor, when there was one. */
  actorId?: string | null;
  /** Short reason — never the offending value itself. */
  detail?: string;
}): void {
  console.warn(
    JSON.stringify({
      at: new Date().toISOString(),
      level: "security",
      ...event,
    })
  );
}
