/**
 * Adaptador de entrada: /api/history/export — histórico em planilha.
 *
 * Uma linha por ITEM (não por procedimento), que é o formato utilizável em
 * tabela dinâmica. A montagem das linhas está no caso de uso; aqui só se
 * serializa e se define o cabeçalho de download.
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
      // `attachment` também é defesa: impede que o conteúdo seja renderizado
      // como página no mesmo domínio.
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
