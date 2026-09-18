import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/app/_shell/Providers";
import SiteFooter from "@/app/_shell/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "DentalStock — Controle de estoque por procedimento",
    template: "%s | DentalStock",
  },
  description:
    "Estoque de clínica odontológica com baixa automática por procedimento, livro-razão de movimentos, custo médio ponderado e painel de consumo.",
  applicationName: "DentalStock",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  // The phone screen sits next to the dental chair: `viewport-fit` keeps the
  // iPhone's bottom bar from covering the finalize button.
  viewportFit: "cover",
};

/**
 * The operating system preference, resolved before the first paint so there is
 * no flash of the wrong theme. The clinic's own theme is applied later, only in
 * authenticated areas (see `TenantTheme`).
 */
const SYSTEM_THEME_SCRIPT = `
(function(){
  try {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();`;

/**
 * Root layout — deliberately WITHOUT reading the session.
 *
 * Reading the cookie here would force Next to render EVERY page on demand,
 * including the public one, which does not depend on who is signed in. The
 * effect would show up straight in TTFB, and therefore in LCP. Per-clinic
 * customization (theme and color) lives in the authenticated layouts, which
 * are dynamic anyway.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
