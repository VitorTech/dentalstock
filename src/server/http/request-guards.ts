import "server-only";

import type { NextRequest } from "next/server";
import { container } from "@/server/container";
import {
  ForbiddenError,
  TooManyRequestsError,
  afterAttempt,
  secondsUntilUnblocked,
  type ThrottleLimits,
  tooManyAttemptsMessage,
} from "@/shared/domain";
import { readClientIp } from "@/shared/infrastructure/http/request";
import { logSecurityEvent } from "@/shared/infrastructure/security-log";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Write budget per origin (OWASP A04 — insecure design).
 *
 * Generous on purpose: a clinic finalizing appointments and restocking writes
 * dozens of times an hour, and a limit that trips on real work would be turned
 * off within a week. What it stops is the automated kind of traffic — a script
 * hammering a write route to exhaust the database or to farm ids.
 */
const WRITE_LIMITS: ThrottleLimits = {
  windowMs: 5 * 60 * 1000,
  blockMs: 5 * 60 * 1000,
  maxAttempts: 300,
};

const writeKey = (ip: string) => `write:ip:${ip}`;

/**
 * Rejects a state-changing request whose `Origin` belongs to another site
 * (defense in depth for CSRF).
 *
 * The session cookie is already `SameSite=Lax`, which keeps it out of
 * cross-site POSTs; this check is the second lock, and it costs one string
 * comparison. A missing `Origin` is accepted: server-to-server clients and
 * curl send none, and those carry no cookie to abuse.
 */
export function ensureSameOrigin(req: NextRequest): void {
  if (!WRITE_METHODS.has(req.method)) return;

  const origin = req.headers.get("origin");
  if (!origin) return;

  const host = req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = "";
  }

  if (!host || originHost !== host) {
    logSecurityEvent({
      type: "csrf.rejected",
      path: req.nextUrl.pathname,
      method: req.method,
      ip: readClientIp(req),
      detail: "origin does not match host",
    });
    throw new ForbiddenError("Origem da requisição não autorizada.");
  }
}

/**
 * Counts one write against the origin's budget and refuses once it is spent.
 *
 * Uses the same counter primitive as the login limit — one table, one policy,
 * different thresholds — so there is a single place where "how do we slow an
 * abusive caller down" is answered.
 */
export async function enforceWriteRateLimit(req: NextRequest): Promise<void> {
  if (!WRITE_METHODS.has(req.method)) return;

  const ip = readClientIp(req);
  if (!ip) return;

  const key = writeKey(ip);
  const now = container.clock.now();
  const state = await container.security.throttle.find(key);

  const wait = secondsUntilUnblocked(state, now);
  if (wait > 0) {
    logSecurityEvent({
      type: "rate_limit.blocked",
      path: req.nextUrl.pathname,
      method: req.method,
      ip,
      detail: `write budget exhausted, ${wait}s left`,
    });
    throw new TooManyRequestsError(tooManyAttemptsMessage(wait), wait);
  }

  await container.security.throttle.save(key, afterAttempt(state, now, WRITE_LIMITS));
}
