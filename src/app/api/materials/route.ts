/** Adaptador de entrada: /api/materials */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  const { tenantId } = actor;
  const materials = await container.catalog.listMaterials.execute(tenantId);
  return NextResponse.json(materials);
});

export const POST = route("catalogManager", async ({ req, actor }) => {
  const { tenantId } = actor;
  const body = await readJsonBody(req);

  const material = await container.catalog.createMaterial.execute(tenantId, {
    name: body.name,
    unit: body.unit,
    category: body.category,
    imageUrl: body.imageUrl,
    stock: body.stock,
    minStock: body.minStock,
    unitCost: body.unitCost,
    expiresAt: body.expiresAt,
  });

  return NextResponse.json(material, { status: 201 });
});
