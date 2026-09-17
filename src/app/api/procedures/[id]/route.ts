/** Adaptador de entrada: /api/procedures/[id] */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const DELETE = route("catalogManager", async ({ params, actor }) => {
  const { tenantId } = actor;
  await container.catalog.deleteProcedure.execute(tenantId, readId(params.id));
  return NextResponse.json({ ok: true });
});
