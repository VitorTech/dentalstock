/** Inbound adapter: /api/materials/[id] */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const PATCH = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const id = readId(params.id);
  const body = await readJsonBody(req);

  const material = await container.catalog.updateMaterial.execute(tenantId, id, {
    minStock: body.minStock,
    supplierId: body.supplierId,
    unitCost: body.unitCost,
    expiresAt: body.expiresAt,
  });

  return NextResponse.json(material);
});
