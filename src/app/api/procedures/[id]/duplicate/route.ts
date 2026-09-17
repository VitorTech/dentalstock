/** Adaptador de entrada: /api/procedures/[id]/duplicate */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const body = await readJsonBody(req);

  const copy = await container.catalog.duplicateProcedure.execute(
    tenantId,
    readId(params.id),
    { name: body.name }
  );

  return NextResponse.json(copy, { status: 201 });
});
