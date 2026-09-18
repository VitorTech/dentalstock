"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout as logoutRequest } from "./api";

/**
 * Ends the session and sends the user back to the login page.
 *
 * It lives in a hook, not inside a menu, because signing out must be available
 * on screens that do not render the app menu.
 *
 * Order matters: we only navigate after the logout route has answered, since
 * that is what clears the cookie. Navigating first would bounce the user back
 * into the app — the middleware only checks that the cookie exists.
 */
export function useLogout() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    try {
      await logoutRequest();
    } catch {
      // A network failure must not trap the user: head to the login page
      // anyway. The session stays valid on the server, but the user is no
      // longer stuck — and the logout route is idempotent on the next try.
    }
    router.replace("/login");
    router.refresh();
  };

  return { logout, leaving };
}
