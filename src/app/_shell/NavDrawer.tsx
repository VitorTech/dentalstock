"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/modules/identity/ui/use-logout";
import ToothIcon from "@/shared/ui/ToothIcon";
import {
  BarChart3,
  Boxes,
  History,
  LogOut,
  ScrollText,
  Settings,
  Stethoscope,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: typeof BarChart3;
  /** Hidden from the assistant, who would get a 403 on opening it. */
  managerOnly?: boolean;
};

/**
 * Navigation grouped by subject.
 *
 * The section labels exist because the list grew: destinations in one running
 * column become a wall of text, which is exactly what made the previous
 * dropdown menu feel oversized.
 */
const GROUPS: { label: string | null; items: Item[] }[] = [
  {
    label: null,
    items: [
      { href: "/procedimentos", label: "Procedimentos", icon: Stethoscope },
      { href: "/dashboard", label: "Painel", icon: BarChart3 },
      { href: "/historico", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Estoque",
    items: [
      { href: "/materiais", label: "Materiais", icon: Boxes },
      { href: "/movimentacoes", label: "Extrato", icon: ScrollText },
    ],
  },
  {
    label: "Cadastro",
    items: [
      { href: "/instrumentais", label: "Instrumentais", icon: Wrench },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/equipe", label: "Equipe", icon: Users, managerOnly: true },
    ],
  },
];

/**
 * Side navigation.
 *
 * It replaces the header dropdown: the floating list covered a good part of
 * the screen. In a drawer, vertical space is natural and the grouped list
 * fits without competing with the content.
 */
export default function NavDrawer({
  open,
  onClose,
  userEmail,
  userRole,
  tenantName,
}: {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  userRole?: string;
  tenantName?: string;
}) {
  const { logout, leaving } = useLogout();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // While the role has not arrived from the API, show the full version: hiding
  // and re-showing items produces a visual jump worse than a click the server
  // would refuse anyway.
  const isManager = userRole !== "ASSISTANT";

  // Navigating closes the drawer — this covers both clicking an item and the
  // browser's back button.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Locks background scrolling: without it the content slides behind the drawer.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navegação"
        className="relative flex h-full w-[284px] flex-col border-r border-hairline bg-surface shadow-pop animate-slideInLeft motion-reduce:animate-none sm:w-[300px]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ToothIcon size={19} />
            </div>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[14px] font-semibold text-ink">
                DentalStock
              </span>
              {tenantName && (
                <span className="truncate text-[11.5px] text-subink">{tenantName}</span>
              )}
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-subink transition-colors hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {GROUPS.map((group, index) => {
            const visible = group.items.filter((item) => !item.managerOnly || isManager);
            if (visible.length === 0) return null;
            return (
              <div key={index} className={index > 0 ? "mt-4" : ""}>
                {group.label && (
                  <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-subink">
                    {group.label}
                  </p>
                )}
                {visible.map((item) => (
                  <NavLink key={item.href} item={item} active={pathname === item.href} />
                ))}
              </div>
            );
          })}

          <div className="my-4 border-t border-hairline" />

          <NavLink
            item={{ href: "/configuracoes", label: "Configurações", icon: Settings }}
            active={pathname === "/configuracoes"}
          />
        </nav>

        <div className="border-t border-hairline px-2.5 py-3">
          {userEmail && (
            <p className="truncate px-3 pb-1.5 text-[11.5px] text-subink" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button
            onClick={logout}
            disabled={leaving}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
          >
            <LogOut size={16} /> {leaving ? "Saindo…" : "Sair"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  tone = "default",
}: {
  item: Item;
  active: boolean;
  tone?: "default" | "accent";
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
        active ? "bg-accent-soft text-accent" : "text-ink hover:bg-canvas"
      }`}
    >
      <Icon
        size={16}
        className={active ? "text-accent" : tone === "accent" ? "text-accent" : "text-subink"}
      />
      {item.label}
    </Link>
  );
}
