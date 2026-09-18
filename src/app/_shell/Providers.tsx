"use client";

import ConfirmProvider from "@/shared/ui/ConfirmProvider";

/** Client providers that wrap the whole application. */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
