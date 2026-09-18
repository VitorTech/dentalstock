/** Inbound adapter: /api/history */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toHistoryPageResponse } from "@/modules/clinical/adapters/in/http/presenters";
import { readInt, readSearch } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export const GET = route("authenticated", async ({ req, actor }) => {
  const params = req.nextUrl.searchParams;

  // Limits applied on read: pagination cannot be used to sweep the database in
  // one go, nor to ask for a negative page.
  const page = readInt(params.get("page"), { min: 1, max: 10_000, fallback: 1 });
  const sinceDays = readInt(params.get("days"), { min: 0, max: 3650, fallback: 0 });

  const result = await container.clinical.listHistory.execute({
    tenantId: actor.tenantId,
    search: readSearch(params.get("q")),
    sinceDays,
    page,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json(toHistoryPageResponse(result, { page, pageSize: PAGE_SIZE }));
});
