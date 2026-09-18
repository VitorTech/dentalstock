/** Inbound adapter: POST /api/auth/logout */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route("public", async () => {
  const transport = container.identity.tokenTransport();

  // Revokes the session on the server before clearing the cookie: clearing the
  // cookie alone would leave the token valid if someone had already copied it.
  await container.identity.logout.execute(await transport.read());
  await transport.clear();

  return NextResponse.json({ ok: true });
});
