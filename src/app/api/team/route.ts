/**
 * Inbound adapter: /api/team — the clinic's own accesses.
 *
 * The tenant never comes from the request body: it is taken from the
 * authenticated identity, inside the use case.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toUserResponse } from "@/modules/identity/adapters/in/http/presenters";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  // Permission to manage the team is checked in the use case, which owns the
  // rule — the guard here only ensures there is a valid session.
  const users = await container.identity.listTeam.execute(actor);
  return NextResponse.json(users.map(toUserResponse));
});

export const POST = route("authenticated", async ({ req, actor }) => {
  const body = await readJsonBody(req);

  const user = await container.identity.inviteTeamMember.execute(actor, {
    email: body.email,
    name: body.name,
    password: body.password,
    role: body.role,
  });

  return NextResponse.json(toUserResponse(user), { status: 201 });
});
