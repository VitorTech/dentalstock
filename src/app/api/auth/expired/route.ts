/**
 * Emergency exit for an invalid session.
 *
 * The middleware runs on the edge and only sees that the cookie is PRESENT —
 * it cannot know whether the session still stands. Without this, an orphan
 * cookie created a loop: /login sent the user into the app (the cookie
 * exists), and the app sent them back to /login (invalid session). Here the
 * cookie is cleared before returning the user to login, breaking the cycle.
 * /api routes skip the middleware, so there is no bounce.
 */
import { NextResponse } from "next/server";
import { container } from "@/server/container";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route("public", async ({ req }) => {
  const transport = container.identity.tokenTransport();
  await container.identity.logout.execute(await transport.read());
  await transport.clear();

  const next = req.nextUrl.searchParams.get("next");
  const url = new URL("/login", req.url);
  // Internal paths only: `next` comes from the URL, is untrusted input and
  // could redirect to an external site (OWASP — open redirect).
  if (next && /^\/[A-Za-z0-9/_-]{0,100}$/.test(next) && next !== "/") {
    url.searchParams.set("next", next);
  }

  return NextResponse.redirect(url);
});
