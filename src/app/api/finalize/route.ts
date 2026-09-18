/**
 * Inbound adapter: /api/finalize
 *
 * The rule (materials deduct, instruments do not) lives in the domain policy;
 * the transaction lives in the repository. Here only HTTP is translated.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toFinalizedResponse, toShortageResponse } from "@/modules/clinical/adapters/in/http/presenters";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("authenticated", async ({ req, actor }) => {
  const body = await readJsonBody(req);

  // Accepts one procedure (`procedureId` + `materials`) or several
  // (`procedures`); normalization belongs to the use case.
  const outcome = await container.clinical.finalizeProcedure.execute(actor, {
    procedureId: body.procedureId,
    materials: body.materials,
    procedures: body.procedures,
  });

  if (!outcome.ok) {
    // 409: the request is valid, but conflicts with current stock.
    return NextResponse.json(toShortageResponse(outcome.shortages), { status: 409 });
  }

  const materials = await container.catalog.listMaterials.execute(actor.tenantId);
  return NextResponse.json(toFinalizedResponse(outcome, materials, actor));
});
