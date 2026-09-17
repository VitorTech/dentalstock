/** Adaptador de entrada: /api/tenant — preferências de tema da clínica. */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { toTenantSettingsResponse } from "@/modules/account/adapters/in/http/presenters";
import { readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  const tenant = await container.account.getTenantSettings.execute(actor.tenantId);
  return NextResponse.json(toTenantSettingsResponse(tenant));
});

export const PATCH = route("authenticated", async ({ req, actor }) => {
  const body = await readJsonBody(req);

  const tenant = await container.account.updateTenantTheme.execute(actor.tenantId, {
    themeMode: body.themeMode,
    accentColor: body.accentColor,
    name: body.name,
  });

  return NextResponse.json(toTenantSettingsResponse(tenant));
});
