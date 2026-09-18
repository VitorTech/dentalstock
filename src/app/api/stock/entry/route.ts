/**
 * Inbound adapter: /api/stock/entry — material restocking.
 *
 * Open to the assistant (default guard): receiving what arrived is the job of
 * whoever takes the box. Someone who cannot see costs simply does not send
 * `unitCost`; the field is optional.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("authenticated", async ({ req, actor }) => {
  const body = await readJsonBody(req);

  // For whoever cannot see costs, the price is ignored by the use case itself.
  const material = await container.inventory.registerStockEntry.execute(actor, {
    materialId: body.materialId,
    quantity: body.quantity,
    unitCost: body.unitCost,
    note: body.note,
  });

  return NextResponse.json(material);
});
