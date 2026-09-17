/**
 * Adaptador de entrada: /api/history/[id]/reverse — estorna uma finalização.
 *
 * POST, não DELETE: o registro não é apagado. Ele passa a constar como
 * estornado, e o material volta ao estoque.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ params, actor }) => {
  // Desfazer lançamento é decisão de quem responde pelo estoque.
  await container.clinical.reverseExecution.execute(actor, readId(params.id));
  return NextResponse.json({ ok: true });
});
