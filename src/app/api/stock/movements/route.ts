/** Adaptador de entrada: /api/stock/movements — extrato do estoque. */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toMovementPageResponse } from "@/modules/inventory/adapters/in/http/presenters";
import { readMovementType } from "@/modules/inventory/adapters/in/http/requests";
import { readId, readInt } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export const GET = route("authenticated", async ({ req, actor }) => {
  const params = req.nextUrl.searchParams;

  const materialId = params.get("materialId");
  const page = readInt(params.get("page"), { min: 1, max: 10_000, fallback: 1 });
  const sinceDays = readInt(params.get("days"), { min: 0, max: 3650, fallback: 0 });

  const result = await container.inventory.listStockMovements.execute({
    tenantId: actor.tenantId,
    materialId: materialId ? readId(materialId, "materialId") : undefined,
    type: readMovementType(params.get("type")),
    sinceDays,
    page,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json(toMovementPageResponse(result, { page, pageSize: PAGE_SIZE }, actor));
});
