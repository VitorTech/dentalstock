/** Inbound adapter: /api/suppliers */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  const { tenantId } = actor;
  const suppliers = await container.catalog.listSuppliers.execute(tenantId);
  return NextResponse.json(suppliers);
});

export const POST = route("catalogManager", async ({ req, actor }) => {
  const { tenantId } = actor;
  const body = await readJsonBody(req);

  const supplier = await container.catalog.createSupplier.execute(tenantId, {
    name: body.name,
    phone: body.phone,
    email: body.email,
    notes: body.notes,
  });

  return NextResponse.json(supplier, { status: 201 });
});
