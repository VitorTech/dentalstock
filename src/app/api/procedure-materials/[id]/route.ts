/** Adaptador de entrada: /api/procedure-materials/[id] */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const PATCH = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const body = await readJsonBody(req);
  await container.catalog.updateProcedureItemQuantity.execute(
    tenantId,
    "MATERIAL",
    readId(params.id),
    body.quantity
  );
  return NextResponse.json({ ok: true });
});

export const DELETE = route("catalogManager", async ({ params, actor }) => {
  const { tenantId } = actor;
  await container.catalog.removeProcedureItem.execute(tenantId, "MATERIAL", readId(params.id));
  return NextResponse.json({ ok: true });
});
