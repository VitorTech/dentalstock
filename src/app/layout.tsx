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
  // A tela do celular fica ao lado da cadeira: `viewport-fit` evita que a
  // barra inferior do iPhone cubra o botão de finalizar.
  viewportFit: "cover",
};

/**
 * Preferência do sistema operacional, resolvida antes da primeira pintura para
 * não haver flash de tema errado. O tema da clínica é aplicado depois, só nas
 * áreas autenticadas (ver `TenantTheme`).
 */
const SYSTEM_THEME_SCRIPT = `
(function(){
  try {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();`;

/**
 * Layout raiz — deliberadamente SEM leitura de sessão.
 *
 * Ler o cookie aqui obrigaria o Next a renderizar TODA página sob demanda,
 * inclusive a pública, que não depende de quem está logado. O efeito apareceria
 * direto no TTFB, e portanto no LCP. A personalização por clínica (tema e cor)
 * vive nos layouts autenticados, que já são dinâmicos.
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
