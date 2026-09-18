/** Inbound adapter: /api/dashboard */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route("authenticated", async ({ actor }) => {
  // The whole actor is passed: the role decides whether the cost block makes
  // it into the response.
  const view = await container.analytics.getDashboard.execute(actor);
  return NextResponse.json(view);
});
