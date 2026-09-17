import type { Config } from "tailwindcss";

const config: Config = {
  // Varre `src` inteiro: a interface vive em `app`, `modules/*/ui` e `shared/ui`.
  // Listar pastas uma a uma já causou classes ausentes quando componentes
  // mudaram de lugar — e isso não gera erro de build, só telas sem estilo.
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        surfaceMuted: "rgb(var(--surface-muted) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        subink: "rgb(var(--subink) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        danger: {
          DEFAULT: "#FF3B30",
          soft: "#FFEDEC",
        },
        success: {
          DEFAULT: "#248A3D",
          soft: "#E9F8ED",
        },
        // Tom intermediário: "vence em 20 dias" e "estoque acabando" pedem
        // atenção, não o vermelho de erro — que perde força se for usado para
        // tudo.
        warn: {
          DEFAULT: "#B25E02",
          soft: "#FFF3E0",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "20px",
        xl3: "28px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        cardHover: "0 2px 4px rgba(0,0,0,0.05), 0 16px 40px rgba(0,0,0,0.09)",
        pop: "0 20px 60px rgba(0,0,0,0.18)",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.28, 0.11, 0.32, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        expand: {
          "0%": { opacity: "0", transform: "scaleY(0.98)" },
          "100%": { opacity: "1", transform: "scaleY(1)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s cubic-bezier(0.28,0.11,0.32,1)",
        expand: "expand 0.3s cubic-bezier(0.28,0.11,0.32,1)",
        slideInLeft: "slideInLeft 0.28s cubic-bezier(0.28,0.11,0.32,1)",
      },
    },
  },
  plugins: [],
};
export default config;
