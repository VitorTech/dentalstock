/**
 * Safe request reading.
 *
 * Defenses applied (OWASP A03/A04):
 *  - Content-Type is checked, so bodies from unexpected origins are not parsed;
 *  - body size is capped, blocking huge payloads that would eat memory;
 *  - invalid JSON becomes a ValidationError, not a 500;
 *  - route identifiers are format-checked before they reach a query.
 */
import type { NextRequest } from "next/server";
import { ValidationError } from "@/shared/domain";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB: plenty for our forms

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ValidationError("Content-Type deve ser application/json.");
  }

  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    throw new ValidationError("Corpo da requisição muito grande.");
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new ValidationError("Corpo da requisição muito grande.");
  }
  if (raw.trim() === "") return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError("JSON inválido.");
  }

  // An array or primitive where an object is expected usually means someone
  // is probing the field validation — reject it explicitly.
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError("Corpo deve ser um objeto JSON.");
  }
  return parsed as Record<string, unknown>;
}

/**
 * Validates an identifier coming from the URL.
 *
 * Ids are cuids (alphanumeric). An allowlist keeps unexpected paths away from
 * the data layer even though Prisma already protects against injection.
 */
export function readId(value: unknown, field = "id"): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new ValidationError("Identificador inválido.", field);
  }
  return value;
}

/** Bounded integer from the query string — prevents abusive pagination. */
export function readInt(
  value: string | null,
  opts: { min: number; max: number; fallback: number }
): number {
  if (value === null || value.trim() === "") return opts.fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return opts.fallback;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(parsed)));
}

/** Sanitized search text: trimmed and truncated. */
export function readSearch(value: string | null, max = 120): string {
  if (!value) return "";
  return value.trim().slice(0, max);
}

/**
 * Client address, used to rate-limit attempts per origin.
 *
 * In production a reverse proxy terminates TLS and fills `X-Forwarded-For`; the
 * first element of the list is the client. The header is forgeable by whoever
 * talks DIRECTLY to the application, so this only holds because the container
 * receives traffic exclusively from the proxy — never expose port 3000.
 *
 * Returns `null` when the header is missing: the per-account limit still
 * applies, and that is the one protecting a specific user's password.
 */
export function readClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  if (!candidate) return null;
  // Length cap: the value becomes a row key in the database.
  return candidate.slice(0, 45);
}
