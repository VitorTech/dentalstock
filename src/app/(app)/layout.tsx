import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/auth";
import TenantTheme from "@/modules/account/ui/TenantTheme";

/**
 * Layout of the internal screens.
 *
 * An orphan cookie (expired or revoked session) goes through the route that
 * clears the cookie before returning to login — going straight to /login would
 * create a loop, because the middleware only sees that the cookie is PRESENT,
 * not whether it is valid.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/api/auth/expired");

  // Nonce minted by the middleware: the theme script only runs when it carries
  // the value the Content-Security-Policy expects.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <TenantTheme
        mode={session.tenant.themeMode}
        accent={session.tenant.accentColor}
        nonce={nonce}
      />
      {children}
    </>
  );
}
