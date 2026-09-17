/**
 * Saída de emergência para sessão inválida.
 *
 * O middleware roda no edge e só enxerga a PRESENÇA do cookie — não sabe se a
 * sessão ainda vale. Sem isto, um cookie órfão criava laço: /login mandava para
 * o app (cookie existe) e o app mandava de volta para /login (sessão inválida).
 * Aqui o cookie é apagado antes de devolver o usuário ao login, quebrando o
 * ciclo. Rotas /api não passam pelo middleware, então não há rebote.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route("public", async ({ req }) => {
  const transport = container.identity.tokenTransport();
  await container.identity.logout.execute(await transport.read());
  await transport.clear();

  const next = req.nextUrl.searchParams.get("next");
  const url = new URL("/login", req.url);
  // Só aceita caminho interno: `next` vindo da URL é entrada não confiável e
  // poderia redirecionar para site externo (OWASP — open redirect).
  if (next && /^\/[A-Za-z0-9/_-]{0,100}$/.test(next) && next !== "/") {
    url.searchParams.set("next", next);
  }

  return NextResponse.redirect(url);
});
