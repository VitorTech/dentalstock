import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/modules/identity/adapters/in/http/session-cookie";

// Public routes (no login required): the landing "/" and the login screen.
const PUBLIC_PATHS = new Set(["/", "/login"]);
// Where a signed-in user lands (the app itself).
const APP_HOME = "/procedimentos";

/** Protects the pages: no session cookie → /login (except on public routes).
 * The middleware runs on the edge and cannot reach the database, so it only
 * checks that the cookie is PRESENT. The real validation (valid, unexpired
 * token) happens in the API routes and in server components. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes handle their own authentication and answer 401 — redirecting a
  // fetch to the login HTML would break the client.
  if (pathname.startsWith("/api")) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.has(pathname);

  // No session on a protected route → login (keeping the destination).
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // A signed-in user needs neither login nor landing — straight to the app.
  if (hasSession && (pathname === "/login" || pathname === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = APP_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Static assets and the manifest stay out: a browser refuses resources served
// behind a redirect, and without a session the middleware would send them to
// /login.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
