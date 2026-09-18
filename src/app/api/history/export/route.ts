/**
 * Inbound adapter: /api/history/export — history as a spreadsheet.
 *
 * One row per ITEM (not per procedure), which is the shape a pivot table can
 * use. Building the rows belongs to the use case; here we only serialize and
 * set the download header.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toHistoryCsv } from "@/modules/clinical/adapters/in/http/presenters";
import { readInt, readSearch } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ req, actor }) => {
  const params = req.nextUrl.searchParams;

  const rows = await container.clinical.exportHistory.execute({
    tenantId: actor.tenantId,
    search: readSearch(params.get("q")),
    sinceDays: readInt(params.get("days"), { min: 0, max: 3650, fallback: 0 }),
  });

  const { csv, filename } = toHistoryCsv(rows, actor, container.clock.now());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // `attachment` is also a defense: it stops the content from being
      // rendered as a page on the same domain.
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
