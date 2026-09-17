"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, Moon, Palette, Sun, SunMoon } from "lucide-react";
import SiteHeader from "@/app/_shell/SiteHeader";
import { ACCENT_PRESETS, DEFAULT_ACCENT, applyTheme, type ThemeMode } from "@/modules/account/ui/theme";
import { getTenantSettings, updateTenantSettings } from "@/modules/account/ui/api";

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getTenantSettings().then((t) => {
      if (t?.themeMode) setMode(t.themeMode);
      if (t?.accentColor) setAccent(t.accentColor);
      if (t?.name) setTenantName(t.name);
      setLoading(false);
    });
  }, []);

  const persist = async (patch: { themeMode?: ThemeMode; accentColor?: string }) => {
    try {
      await updateTenantSettings(patch);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
      // relê o layout no servidor para o tema valer em toda a navegação
      router.refresh();
    } catch {
      // Preferência visual: manter a escolha aplicada localmente é melhor que
      // reverter a tela na cara do usuário por uma falha momentânea.
    }
  };

  const handleMode = (m: ThemeMode) => {
    setMode(m);
    applyTheme(m, accent);
    persist({ themeMode: m });
  };

  const handleAccent = (color: string) => {
    setAccent(color);
    applyTheme(mode, color);
    persist({ accentColor: color });
  };

  const isCustom = !loading && !ACCENT_PRESETS.some((p) => p.value.toLowerCase() === accent.toLowerCase());

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface">
            <SunMoon size={16} />
          </div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[42px]">
            Configurações
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-subink">
            Personalize o tema da {tenantName || "clínica"}. As preferências ficam salvas na conta e
            valem para todos os usuários desta clínica.
          </p>
          {saved && (
            <span className="mt-3 inline-block rounded-full bg-success-soft px-3 py-1 text-[12.5px] font-medium text-success">
              Preferências salvas
            </span>
          )}
        </div>

        {/* Tema */}
        <div className="mb-6 rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
          <h2 className="mb-1 text-[16px] font-semibold text-ink">Tema</h2>
          <p className="mb-4 text-[13px] text-subink">
            Escolha entre claro, escuro ou acompanhar o sistema.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ value, label, icon: Icon }) => {
              const active = !loading && mode === value;
              return (
                <button
                  key={value}
                  onClick={() => handleMode(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-hairline text-subink hover:bg-canvas hover:text-ink"
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cor de destaque */}
        <div className="rounded-xl2 border border-hairline bg-surface p-6 shadow-card">
          <div className="mb-1 flex items-center gap-2">
            <Palette size={16} className="text-subink" />
            <h2 className="text-[16px] font-semibold text-ink">Cor de destaque</h2>
          </div>
          <p className="mb-4 text-[13px] text-subink">
            Usada em botões, links e destaques. Escolha uma predefinida ou uma cor personalizada.
          </p>

          <div className="flex flex-wrap gap-3">
            {ACCENT_PRESETS.map((preset) => {
              const active = !loading && accent.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  onClick={() => handleAccent(preset.value)}
                  aria-label={preset.name}
                  title={preset.name}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                    active ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                  }`}
                  style={{ backgroundColor: preset.value }}
                >
                  {active && <Check size={16} color="#fff" />}
                </button>
              );
            })}

            <label
              className={`relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-hairline transition-transform hover:scale-105 ${
                isCustom ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
              }`}
              title="Cor personalizada"
              style={isCustom ? { backgroundColor: accent, borderStyle: "solid" } : undefined}
            >
              {!isCustom && <Palette size={16} className="text-subink" />}
              {isCustom && <Check size={16} color="#fff" />}
              <input
                type="color"
                value={accent}
                onChange={(e) => handleAccent(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Escolher cor personalizada"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-hairline bg-canvas px-4 py-3">
            <span className="text-[13px] text-subink">Prévia:</span>
            <button className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover">
              Botão
            </button>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-[12.5px] font-medium text-accent">
              Destaque
            </span>
            <span className="font-mono text-[12.5px] uppercase text-subink">{accent}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
