"use client";

import ConfirmProvider from "@/shared/ui/ConfirmProvider";

/** Providers de cliente que envolvem toda a aplicação. */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
