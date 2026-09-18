"use client";

/**
 * HTTP transport for the screens.
 *
 * The only place that knows about `fetch`, error statuses and session
 * redirects. No screen builds a request by hand: each feature exposes its
 * operations in `modules/<feature>/ui/api.ts`, and those call in here.
 *
 * Why it exists: the middleware runs on the edge and can only check whether
 * the session cookie EXISTS — not whether it is still valid. With an expired
 * cookie navigation succeeds, but every API call answers 401, and screens used
 * to break trying to use the error body as a list (`e.map is not a function`).
 *
 * Central handling:
 *   401 → invalid session → back to the login page
 *   read  (`apiGet`)     → returns the fallback, without breaking the screen
 *   write (`apiSend`)    → throws `ApiError`, so the screen decides what to say
 */

/** Write failure carrying the message the server returned. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Rejected field, when validation points at one. */
    readonly field?: string,
    /** Seconds until a retry is allowed (429 responses). */
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let redirecting = false;

/**
 * Expired session: clear the cookie before heading to the login page.
 *
 * The middleware only sees whether the cookie EXISTS; without this cleanup it
 * would send the user straight back into the app — a ping-pong.
 */
async function handleExpiredSession() {
  if (redirecting) return;
  redirecting = true;
  const next = window.location.pathname;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* head to the login page regardless */
  }
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

/** A GET that never throws: on failure it returns `fallback`. */
export async function apiGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);

    if (res.status === 401) {
      await handleExpiredSession();
      return fallback;
    }

    if (!res.ok) return fallback;

    const data = await res.json();

    // If a list was expected and something else arrived, keep the fallback
    // rather than letting the screen blow up on .map().
    if (Array.isArray(fallback) && !Array.isArray(data)) return fallback;

    return data as T;
  } catch {
    return fallback;
  }
}

/**
 * `GET` is allowed here for the few reads that must surface the server message
 * instead of silently degrading to a default value.
 */
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * A request whose result matters. Returns the parsed body or throws
 * `ApiError`.
 *
 * Deliberately different from `apiGet`: a failed read can degrade to an empty
 * list, but a write that fails silently makes the user believe it was saved.
 * The caller decides how to surface the error.
 */
export async function apiSend<T = void>(
  url: string,
  method: Method,
  body?: unknown
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError("Falha de conexão com o servidor.", 0);
  }

  if (res.status === 401) {
    await handleExpiredSession();
    throw new ApiError("Sessão expirada.", 401);
  }

  const payload = await readJson(res);

  if (!res.ok) {
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new ApiError(
      typeof payload?.error === "string" ? payload.error : "Não foi possível concluir a operação.",
      res.status,
      typeof payload?.field === "string" ? payload.field : undefined,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined
    );
  }

  return payload as T;
}

/** An empty body (204) or non-JSON is not an error: it becomes `undefined`. */
async function readJson(res: Response): Promise<Record<string, unknown> | undefined> {
  const text = await res.text();
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
