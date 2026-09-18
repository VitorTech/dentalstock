/** Inbound adapter: /api/procedures */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody, readSearch } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ req, actor }) => {
  const { tenantId } = actor;
  const search = readSearch(req.nextUrl.searchParams.get("q"));
  const procedures = await container.catalog.listProcedures.execute(tenantId, search);
  return NextResponse.json(procedures);
});

export const POST = route("catalogManager", async ({ req, actor }) => {
  const { tenantId } = actor;
  const body = await readJsonBody(req);

  const procedure = await container.catalog.createProcedure.execute(tenantId, {
    name: body.name,
    category: body.category,
    description: body.description,
  });

  return NextResponse.json(procedure, { status: 201 });
});
