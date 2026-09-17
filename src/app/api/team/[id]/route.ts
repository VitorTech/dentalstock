/** Adaptador de entrada: /api/team/[id] */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toUserResponse } from "@/modules/identity/adapters/in/http/presenters";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const PATCH = route("authenticated", async ({ req, params, actor }) => {
  const id = readId(params.id);
  const body = await readJsonBody(req);

  // Troca de senha e troca de papel numa rota só: são as duas manutenções
  // que a clínica faz num acesso, e ambas encerram as sessões do usuário.
  if (body.password !== undefined) {
    await container.identity.resetTeamMemberPassword.execute(actor, id, body.password);
    return NextResponse.json({ ok: true });
  }

  const user = await container.identity.changeTeamMemberRole.execute(actor, id, body.role);
  return NextResponse.json(toUserResponse(user));
});

export const DELETE = route("authenticated", async ({ params, actor }) => {
  await container.identity.removeTeamMember.execute(actor, readId(params.id));
  return NextResponse.json({ ok: true });
});
