/**
 * Adaptador de entrada: POST /api/auth/login
 *
 * Responsabilidade única — traduzir HTTP para o caso de uso e de volta.
 * Não há regra de negócio nem acesso a banco aqui.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readClientIp, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("public", async ({ req }) => {
  const body = await readJsonBody(req);

  const result = await container.identity.login.execute({
    email: body.email,
    password: body.password,
    // Origem da tentativa: entra no limite por IP. O caso de uso não sabe o que
    // é um cabeçalho — quem lê o protocolo é esta rota.
    ipAddress: readClientIp(req),
  });

  // O token é entregue em cookie httpOnly — nunca no corpo da resposta, para
  // não ficar acessível a JavaScript nem em histórico/log de rede.
  await container.identity.tokenTransport().write(result.token, result.expiresAt);

  return NextResponse.json({ ok: true });
});
