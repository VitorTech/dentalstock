/**
 * Adaptador de entrada: /api/stock/adjust — correção manual de saldo.
 *
 * Exige motivo (validado no caso de uso). Ajuste sem justificativa é justamente
 * o registro que não explica nada quando o estoque não fecha.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("catalogManager", async ({ req, actor }) => {
  // Diferente da entrada: corrigir saldo "na canetada" é decisão de quem
  // responde pelo estoque, não tarefa de bancada.
  const body = await readJsonBody(req);

  const material = await container.inventory.adjustStock.execute(actor, {
    materialId: body.materialId,
    stock: body.stock,
    reason: body.reason,
  });

  return NextResponse.json(material);
});
