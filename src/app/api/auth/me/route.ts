/** Inbound adapter: GET /api/auth/me — identity and clinic theme. */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toSessionResponse } from "@/modules/identity/adapters/in/http/presenters";
import { UnauthorizedError } from "@/shared/domain";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  const session = await container.identity.getCurrentSession.execute(actor);
  // An orphan session (deleted user or clinic) is the same as having none.
  if (!session) throw new UnauthorizedError();
  return NextResponse.json(toSessionResponse(session));
});
