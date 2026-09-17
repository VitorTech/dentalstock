/**
 * Adaptador de entrada: /api/stock/entry — reposição de material.
 *
 * Liberado ao auxiliar (guarda padrão): dar entrada no que chegou é o trabalho
 * de quem recebe a caixa. Quem não pode ver custo simplesmente não envia
 * `unitCost`; o campo é opcional.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("authenticated", async ({ req, actor }) => {
  const body = await readJsonBody(req);

  // Quem não pode ver custo tem o preço ignorado pelo próprio caso de uso.
  const material = await container.inventory.registerStockEntry.execute(actor, {
    materialId: body.materialId,
    quantity: body.quantity,
    unitCost: body.unitCost,
    note: body.note,
  });

  return NextResponse.json(material);
});
