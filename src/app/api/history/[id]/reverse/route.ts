/**
 * Inbound adapter: /api/history/[id]/reverse — reverses a finalization.
 *
 * POST, not DELETE: the record is not erased. It starts showing as reversed,
 * and the materials go back to stock.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readId } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ params, actor }) => {
  // Undoing an entry is a decision for whoever answers for the stock.
  await container.clinical.reverseExecution.execute(actor, readId(params.id));
  return NextResponse.json({ ok: true });
});
