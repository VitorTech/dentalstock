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

  return (
    <>
      <TenantTheme mode={session.tenant.themeMode} accent={session.tenant.accentColor} />
      {children}
    </>
  );
}
