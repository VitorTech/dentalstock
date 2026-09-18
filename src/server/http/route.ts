/**
 * API route declaration.
 *
 * Every route goes through here, which guarantees four things by construction:
 *
 *  - **The access level is mandatory and explicit.** There is no route without
 *    an access decision: even public ones declare `"public"`. Before, each
 *    route called the guard on its own — forgetting the call opened the route
 *    with nothing flagging it.
 *
 *  - **Every write is checked for origin and budget.** The CSRF check and the
 *    per-origin write limit run before the handler, so a new route inherits
 *    both without its author remembering them.
 *
 *  - **Denials are logged.** 401, 403 and 429 leave a structured line with
 *    path, method and address — the trail an incident is investigated from.
 *
 *  - **The Next contract lives in one place.** Reading `params` and handling
 *    errors are not repeated in the handlers. Next 15 turned `params` into a
 *    Promise; awaiting it happens here, and not one dynamic route had to
 *    change.
 */
import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { DomainError, ForbiddenError, TooManyRequestsError, UnauthorizedError, type AuthenticatedActor } from "@/shared/domain";
import { withErrorHandling } from "@/shared/infrastructure/http/errors";
import { readClientIp } from "@/shared/infrastructure/http/request";
import { logSecurityEvent, type SecurityEvent } from "@/shared/infrastructure/security-log";
import { requireAuthenticated, requireCatalogManager } from "../auth";
import { ensureSameOrigin, enforceWriteRateLimit } from "./request-guards";

/**
 * - `public`: no session (login, health check).
 * - `authenticated`: valid session. The default for data routes.
 * - `catalogManager`: on top of that, may change the clinic's catalog.
 */
export type Access = "public" | "authenticated" | "catalogManager";

export interface RouteContext<A extends Access> {
  req: NextRequest;
  params: Record<string, string>;
  actor: A extends "public" ? null : AuthenticatedActor;
}

const GUARDS: Record<Access, () => Promise<AuthenticatedActor | null>> = {
  public: async () => null,
  authenticated: requireAuthenticated,
  catalogManager: requireCatalogManager,
};

/** Security-relevant failures worth a log line; everything else is noise. */
function securityEventFor(error: unknown): SecurityEvent | null {
  if (error instanceof UnauthorizedError) return "access.denied";
  if (error instanceof ForbiddenError) return "access.denied";
  if (error instanceof TooManyRequestsError) return "rate_limit.blocked";
  return null;
}

export function route<A extends Access>(
  access: A,
  handler: (ctx: RouteContext<A>) => Promise<NextResponse>
) {
  return withErrorHandling(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      try {
        ensureSameOrigin(req);
        await enforceWriteRateLimit(req);

        const actor = (await GUARDS[access]()) as RouteContext<A>["actor"];
        const params = (await context?.params) ?? {};
        const response = await handler({ req, params, actor });

        // Authenticated payloads carry clinic data; no shared cache may keep a
        // copy that another session could be served.
        if (access !== "public") response.headers.set("Cache-Control", "no-store");
        return response;
      } catch (error) {
        const type = securityEventFor(error);
        if (type) {
          logSecurityEvent({
            type,
            path: req.nextUrl.pathname,
            method: req.method,
            ip: readClientIp(req),
            detail: error instanceof DomainError ? error.code : undefined,
          });
        }
        throw error;
      }
    }
  );
}
