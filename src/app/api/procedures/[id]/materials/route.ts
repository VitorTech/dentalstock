/** Adaptador de entrada: /api/procedures/[id]/materials */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const procedureId = readId(params.id);
  const body = await readJsonBody(req);

  const procedure = await container.catalog.linkMaterialToProcedure.execute(
    tenantId,
    procedureId,
    { materialId: body.materialId, quantity: body.quantity }
  );

  // Devolve o vínculo recém-criado, formato que a interface já consome.
  const created = procedure?.materials.find((pm) => pm.materialId === body.materialId);
  return NextResponse.json(created ?? {}, { status: 201 });
});
