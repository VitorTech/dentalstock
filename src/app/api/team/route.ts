/**
 * Adaptador de entrada: /api/team — acessos da própria clínica.
 *
 * Distinto de /api/admin/users, que é o console da PLATAFORMA. Aqui o tenant
 * nunca vem do corpo da requisição: sai da identidade autenticada, dentro do
 * caso de uso.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toUserResponse } from "@/modules/identity/adapters/in/http/presenters";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  // A permissão de gerenciar equipe é conferida no caso de uso, que é quem
  // conhece a regra — o guarda aqui garante só sessão e assinatura.
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
