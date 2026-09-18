/**
 * API route declaration.
 *
 * Every route goes through here, which guarantees two things by construction:
 *
 *  - **The access level is mandatory and explicit.** There is no route without
 *    an access decision: even public ones declare `"public"`. Before, each
 *    route called the guard on its own — forgetting the call opened the route
 *    with nothing flagging it.
 *
 *  - **The Next contract lives in one place.** Reading `params` and handling
 *    errors are not repeated in the handlers. When the project moves to Next
 *    15, where `params` becomes a Promise, the change happens in this file —
 *    not in every dynamic route.
 */
import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import type { AuthenticatedActor } from "@/shared/domain";
import { withErrorHandling } from "@/shared/infrastructure/http/errors";
import { requireAuthenticated, requireCatalogManager } from "../auth";

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

export function route<A extends Access>(
  access: A,
  handler: (ctx: RouteContext<A>) => Promise<NextResponse>
) {
  return withErrorHandling(
    async (req: NextRequest, context: { params: Record<string, string> }) => {
      const actor = (await GUARDS[access]()) as RouteContext<A>["actor"];
      return handler({ req, params: context?.params ?? {}, actor });
    }
  );
}
