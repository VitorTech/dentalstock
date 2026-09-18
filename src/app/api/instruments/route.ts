/** Inbound adapter: /api/instruments */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  const { tenantId } = actor;
  const instruments = await container.catalog.listInstruments.execute(tenantId);
  return NextResponse.json(instruments);
});

export const POST = route("catalogManager", async ({ req, actor }) => {
  const { tenantId } = actor;
  const body = await readJsonBody(req);

  const instrument = await container.catalog.createInstrument.execute(tenantId, {
    name: body.name,
    category: body.category,
    imageUrl: body.imageUrl,
    stock: body.stock,
  });

  return NextResponse.json(instrument, { status: 201 });
});
