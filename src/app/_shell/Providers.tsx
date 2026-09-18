"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConfirmProvider from "@/shared/ui/ConfirmProvider";
import { ApiError } from "@/shared/ui/api-client";

/**
 * Client providers that wrap the whole application.
 *
 * The `QueryClient` is created inside state, not at module scope: at module
 * scope a single client would be shared by every request the server renders,
 * mixing one clinic's cache into another's response.
 *
 * The defaults encode decisions this product already had, hand-rolled before:
 *
 *  - `staleTime` of a minute — clinic stock does not change by the second, and
 *    it is what keeps opening a specialty with twelve procedures from firing
 *    twelve identical requests;
 *  - refetch on window focus, so data the front desk left open all morning is
 *    fresh the moment someone comes back to it;
 *  - no retry for 4xx: a 401 or a 422 will not get better by being repeated,
 *    and retrying a write is how duplicates are created.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>{children}</ConfirmProvider>
    </QueryClientProvider>
  );
}
