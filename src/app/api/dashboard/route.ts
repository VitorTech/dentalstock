/** Adaptador de entrada: /api/dashboard */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  // O ator inteiro é passado: é o papel que decide se o bloco de custo entra
  // na resposta.
  const view = await container.analytics.getDashboard.execute(actor);
  return NextResponse.json(view);
});
