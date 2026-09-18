"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu as MenuIcon } from "lucide-react";
import NavDrawer from "./NavDrawer";
import ToothIcon from "@/shared/ui/ToothIcon";
import { useMe } from "@/modules/identity/ui/use-me";

/**
 * Header shared by every internal screen.
 *
 * Deliberately lean: menu button on the left, the clinic's brand (→ home) and
 * the optional `children` (e.g. the low-stock indicator). All navigation lives
 * in the side drawer — as a header-anchored dropdown, the list grew until it
 * covered half the screen.
 */
export default function SiteHeader({
  maxWidth = "max-w-3xl",
  children,
}: {
  maxWidth?: string;
  children?: React.ReactNode;
}) {
  const { me } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-hairline/80 bg-surface/70 backdrop-blur-xl">
        <div
          className={`mx-auto flex ${maxWidth} flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 sm:py-3.5`}
        >
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-canvas"
          >
            <MenuIcon size={17} />
          </button>

          <Link href="/procedimentos" className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ToothIcon size={18} />
            </div>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[14px] font-semibold text-ink">
                DentalStock
              </span>
              {me?.tenant.name && (
                <span className="truncate text-[11.5px] text-subink">{me.tenant.name}</span>
              )}
            </span>
          </Link>

          {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
        </div>
      </header>

      <NavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userEmail={me?.user.email}
        userRole={me?.user.role}
        tenantName={me?.tenant.name}
      />
    </>
  );
}
