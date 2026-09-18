/**
 * Name of the session cookie.
 *
 * A dependency-free file on purpose: it is imported by the middleware, which
 * runs on the edge runtime and cannot load Prisma or `next/headers`. The name
 * used to exist in two places (`SESSION_COOKIE` and `ACCESS_TOKEN_COOKIE`);
 * changing one without the other broke login silently.
 */
export const SESSION_COOKIE = "session";
