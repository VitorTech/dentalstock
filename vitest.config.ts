import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuração de testes.
 *
 * Ambiente `node` de propósito: a prioridade de cobertura é o domínio e os
 * casos de uso, que são puros e não conhecem navegador. Quando entrarem testes
 * de componente, eles pedem `environment: "jsdom"` por arquivo — via
 * `// @vitest-environment jsdom` — em vez de tornar tudo mais lento.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // O código de produção não é varrido por engano em builds de imagem.
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
