/**
 * Inbound adapter: POST /api/auth/login
 *
 * Single responsibility — translate HTTP into the use case and back. There is
 * no business rule and no database access here.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";
import { readClientIp, readJsonBody } from "@/shared/infrastructure/http/request";

export const dynamic = "force-dynamic";

export const POST = route("public", async ({ req }) => {
  const body = await readJsonBody(req);

  const result = await container.identity.login.execute({
    email: body.email,
    password: body.password,
    // Origin of the attempt: feeds the per-IP limit. The use case knows
    // nothing about headers — reading the protocol is this route's job.
    ipAddress: readClientIp(req),
  });

  // The token is delivered in an httpOnly cookie — never in the response body,
  // so it stays out of reach of JavaScript and of network history/logs.
  await container.identity.tokenTransport().write(result.token, result.expiresAt);

  return NextResponse.json({ ok: true });
});
