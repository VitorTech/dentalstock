"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import ToothIcon from "@/shared/ui/ToothIcon";
import Spinner from "@/shared/ui/Spinner";
import { ApiError } from "@/shared/ui/api-client";
import { login } from "@/modules/identity/ui/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });

      const next = new URLSearchParams(window.location.search).get("next");
      const dest = next && next.startsWith("/") && next !== "/" ? next : "/procedimentos";
      // refresh so the layout re-reads the session and applies the clinic theme
      router.replace(dest);
      router.refresh();
    } catch (e) {
      // Includes the 429 from the attempt limit: the message already carries
      // the waiting time computed by the server.
      setError(e instanceof ApiError ? e.message : "Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-accent";

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/20">
            <ToothIcon size={34} strokeWidth={1.6} />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">DentalStock</h1>
          <p className="mt-1.5 text-[14px] text-subink">
            Gestão de estoque para clínicas odontológicas
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl2 border border-hairline bg-surface p-6 shadow-card"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">E-mail</span>
            <input
              autoFocus
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@clinica.com"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-subink">Senha</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} w-full pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subink transition-colors hover:text-ink"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-full bg-accent py-3 text-[14.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
          >
            {submitting ? <Spinner size={16} /> : <LogIn size={16} />}
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12.5px] text-subink">
          Problemas para acessar? Fale com o administrador da clínica.
        </p>
      </div>
    </main>
  );
}
