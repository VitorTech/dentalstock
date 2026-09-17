"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Abre o modal de confirmação e resolve com true/false.
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Excluir?", tone: "danger" })) { ... }
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>.");
  return ctx;
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [options, close]);

  const danger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl3 bg-surface p-6 shadow-pop animate-fadeIn"
          >
            <div className="flex gap-3.5">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  danger ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
                }`}
              >
                <AlertTriangle size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-ink">{options.title}</h3>
                {options.message && (
                  <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-subink">
                    {options.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                autoFocus
                onClick={() => close(false)}
                className="rounded-full px-4 py-2 text-[13.5px] font-medium text-subink transition-colors hover:bg-canvas"
              >
                {options.cancelLabel ?? "Cancelar"}
              </button>
              <button
                onClick={() => close(true)}
                className={`rounded-full px-4 py-2 text-[13.5px] font-medium text-white transition-colors ${
                  danger ? "bg-danger hover:brightness-95" : "bg-accent hover:bg-accent-hover"
                }`}
              >
                {options.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
