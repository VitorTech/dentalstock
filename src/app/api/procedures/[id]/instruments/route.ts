/** Adaptador de entrada: /api/procedures/[id]/instruments */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const procedureId = readId(params.id);
  const body = await readJsonBody(req);

  const procedure = await container.catalog.linkInstrumentToProcedure.execute(
    tenantId,
    procedureId,
    { instrumentId: body.instrumentId, quantity: body.quantity }
  );

  const created = procedure?.instruments.find((pi) => pi.instrumentId === body.instrumentId);
  return NextResponse.json(created ?? {}, { status: 201 });
});
