/** Adaptador de entrada: GET /api/auth/me — identidade e tema da clínica. */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toSessionResponse } from "@/modules/identity/adapters/in/http/presenters";
import { UnauthorizedError } from "@/shared/domain";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  const session = await container.identity.getCurrentSession.execute(actor);
  // Sessão órfã (usuário ou clínica excluídos) equivale a não ter sessão.
  if (!session) throw new UnauthorizedError();
  return NextResponse.json(toSessionResponse(session));
});
