/** Adaptador de entrada: /api/instruments/[id] */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const PATCH = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const id = readId(params.id);
  const body = await readJsonBody(req);

  const instrument = await container.catalog.updateInstrumentStock.execute(tenantId, id, {
    stock: body.stock,
  });

  return NextResponse.json(instrument);
});
