export type ThemeMode = "light" | "dark" | "system";

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: "Azul", value: "#0071e3" },
  { name: "Verde", value: "#248a3d" },
  { name: "Roxo", value: "#7c3aed" },
  { name: "Rosa", value: "#e5397f" },
  { name: "Laranja", value: "#f5730a" },
  { name: "Vermelho", value: "#e0322c" },
  { name: "Teal", value: "#0a9396" },
  { name: "Grafite", value: "#48484a" },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].value;

/** Applies the theme to <html> immediately (instant feedback on the Settings
 * screen). Persistence happens in the database, per tenant — see /api/tenant. */
export function applyTheme(mode: ThemeMode, accent: string) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.style.setProperty("--accent", accent);
}
