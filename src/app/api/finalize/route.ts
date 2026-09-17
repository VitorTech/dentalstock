/**
 * Adaptador de entrada: /api/finalize
 *
 * A regra (material baixa, instrumental não) está na política de domínio; a
 * transação está no repositório. Aqui só se traduz HTTP.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toFinalizedResponse, toShortageResponse } from "@/modules/clinical/adapters/in/http/presenters";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("authenticated", async ({ req, actor }) => {
  const body = await readJsonBody(req);

  // Aceita um procedimento (`procedureId` + `materials`) ou vários
  // (`procedures`); a normalização fica no caso de uso.
  const outcome = await container.clinical.finalizeProcedure.execute(actor, {
    procedureId: body.procedureId,
    materials: body.materials,
    procedures: body.procedures,
  });

  if (!outcome.ok) {
    // 409: o pedido é válido, mas conflita com o estoque atual.
    return NextResponse.json(toShortageResponse(outcome.shortages), { status: 409 });
  }

  const materials = await container.catalog.listMaterials.execute(actor.tenantId);
  return NextResponse.json(toFinalizedResponse(outcome, materials, actor));
});
