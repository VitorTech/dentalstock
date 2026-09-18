/** Inbound adapter: /api/suppliers/[id] */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const PATCH = route("catalogManager", async ({ req, params, actor }) => {
  const { tenantId } = actor;
  const id = readId(params.id);
  const body = await readJsonBody(req);

  const supplier = await container.catalog.updateSupplier.execute(tenantId, id, {
    name: body.name,
    phone: body.phone,
    email: body.email,
    notes: body.notes,
  });

  return NextResponse.json(supplier);
});

export const DELETE = route("catalogManager", async ({ params, actor }) => {
  const { tenantId } = actor;
  await container.catalog.deleteSupplier.execute(tenantId, readId(params.id));
  return NextResponse.json({ ok: true });
});
