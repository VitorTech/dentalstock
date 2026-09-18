"use client";

import { TriangleAlert } from "lucide-react";

/**
 * Failure notice at the top of a list.
 *
 * It exists because a silent write failure is worse than a visible error: the
 * user closes the screen believing the change was saved. Renders nothing when
 * there is no message, so callers need no conditional.
 */
export default function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-2 rounded-xl2 bg-danger-soft px-4 py-3 text-[13px] text-danger"
    >
      <TriangleAlert size={15} className="shrink-0" />
      {message}
    </div>
  );
}
