/** Adaptador de entrada: POST /api/auth/logout */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route("public", async () => {
  const transport = container.identity.tokenTransport();

  // Revoga a sessão no servidor antes de limpar o cookie: só apagar o cookie
  // deixaria o token válido caso alguém já o tivesse capturado.
  await container.identity.logout.execute(await transport.read());
  await transport.clear();

  return NextResponse.json({ ok: true });
});
