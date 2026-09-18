/**
 * Inbound adapter: /api/stock/adjust — manual balance correction.
 *
 * Requires a reason (validated in the use case). An adjustment without
 * justification is exactly the record that explains nothing when stock does
 * not add up.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ req, actor }) => {
  // Unlike an entry: correcting a balance by hand is a decision for whoever
  // answers for the stock, not a chairside task.
  const body = await readJsonBody(req);

  const material = await container.inventory.adjustStock.execute(actor, {
    materialId: body.materialId,
    stock: body.stock,
    reason: body.reason,
  });

  return NextResponse.json(material);
});
