/**
 * Regras de arquitetura verificadas em CI (`npm run arch`).
 *
 * Cada regra aqui é uma decisão descrita em ARCHITECTURE.md. Se uma delas
 * precisar de exceção, a conversa é sobre a arquitetura — não sobre silenciar
 * o verificador.
 */

/**
 * Ordem dos módulos: cada um só pode depender dos que vêm ANTES.
 * Ex.: `inventory` usa `catalog`; `catalog` nunca usa `inventory`.
 */
const MODULE_ORDER = ["account", "identity", "catalog", "inventory", "clinical", "analytics"];

const moduleOrderRules = MODULE_ORDER.map((name, index) => {
  const later = MODULE_ORDER.slice(index + 1);
  return later.length === 0
    ? null
    : {
        name: `module-order:${name}`,
        comment: `"${name}" não pode depender de módulos posteriores (${later.join(", ")}).`,
        severity: "error",
        from: { path: `^src/modules/${name}/` },
        to: { path: `^src/modules/(${later.join("|")})/` },
      };
}).filter(Boolean);

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "Ciclos tornam a ordem de carregamento frágil e acoplam o que deveria ser independente.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // ── Camadas dentro de cada módulo ────────────────────────────────────────
    {
      name: "domain-is-pure",
      comment:
        "Domínio é código puro: só depende de outros domínios. Nada de aplicação, adaptadores, UI, framework ou bibliotecas.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+|shared)/domain/", pathNot: "\\.test\\.ts$" },
      to: {
        pathNot: ["^src/(modules/[^/]+|shared)/domain/"],
      },
    },
    {
      name: "application-depends-on-ports-only",
      comment:
        "Casos de uso falam com o mundo por portas (interfaces). Implementações concretas entram pelo container.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+|shared)/application/", pathNot: "\\.test\\.ts$" },
      to: {
        pathNot: ["^src/(modules/[^/]+|shared)/(domain|application)/"],
      },
    },
    {
      name: "ui-stays-on-the-client-side",
      comment:
        "Interface não importa aplicação, adaptadores, infraestrutura ou o container: conversa com o servidor só via HTTP.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+|shared)/ui/" },
      to: {
        path: [
          "^src/(modules/[^/]+|shared)/(application|adapters|infrastructure)/",
          "^src/server/",
          "^src/app/",
          "@prisma/client",
          "server-only",
        ],
      },
    },
    {
      name: "adapters-do-not-reach-up",
      comment: "Adaptadores implementam portas; não conhecem UI, rotas nem o container.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+/adapters|shared/infrastructure)/" },
      to: { path: ["^src/(modules/[^/]+|shared)/ui/", "^src/app/", "^src/server/"] },
    },

    // ── Fronteiras entre módulos ────────────────────────────────────────────
    ...moduleOrderRules,
    {
      name: "shared-knows-no-module",
      comment: "`shared` é a base de todos; se precisa de um módulo, o código pertence a esse módulo.",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "cross-module-through-barrels",
      comment:
        "De fora do módulo, domínio e aplicação são acessados pelo index.ts — o que não está exportado ali é detalhe interno.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/[^/]+/(domain|application)/.+",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/(domain|application)/index\\.ts$"],
      },
    },
    {
      name: "outside-modules-through-barrels",
      comment: "Rotas, páginas e o container também entram no domínio e na aplicação pelo index.ts.",
      severity: "error",
      from: { path: "^src/(app|server)/" },
      to: {
        path: "^src/modules/[^/]+/(domain|application)/.+",
        pathNot: [
          "^src/modules/[^/]+/(domain|application)/index\\.ts$",
          // O container é a raiz de composição: é o único lugar que instancia casos de uso.
          "^src/modules/[^/]+/application/use-cases/",
        ],
      },
    },
    {
      name: "only-container-wires-use-cases",
      comment: "Casos de uso e adaptadores de saída são instanciados apenas em src/server/container.ts.",
      severity: "error",
      from: { path: "^src/", pathNot: ["^src/server/container\\.ts$", "^src/modules/"] },
      to: {
        path: [
          "^src/modules/[^/]+/application/use-cases/",
          "^src/modules/[^/]+/adapters/out/",
          "^src/shared/infrastructure/(prisma|system)\\.ts$",
        ],
      },
    },

    // ── Borda HTTP e servidor ───────────────────────────────────────────────
    {
      name: "routes-are-thin",
      comment:
        "Rotas só traduzem HTTP: acesso por route(), regra pelo container, saída pelos presenters. Nunca Prisma direto.",
      severity: "error",
      from: { path: "^src/app/api/" },
      to: { path: ["@prisma/client", "^src/modules/[^/]+/ui/", "^src/(app/_shell|shared/ui)/"] },
    },
    {
      name: "server-code-stays-out-of-module-ui",
      comment: "O container e a autenticação de servidor não podem ser importados por componentes de módulo.",
      severity: "error",
      from: { path: "^src/(modules|shared)/" },
      to: { path: "^src/server/" },
    },
    {
      name: "module-ui-does-not-know-the-shell",
      comment: "O shell (cabeçalho, menu) compõe as telas; as telas de módulo não dependem dele.",
      severity: "error",
      from: { path: "^src/modules/" },
      to: { path: "^src/app/" },
    },
    {
      name: "feature-internals-are-private",
      comment:
        "ui/internal é o miolo de uma feature: só a própria feature entra lá. É o que faz o resto da ui ser API pública de verdade.",
      severity: "error",
      from: { path: "^src/(app|shared|modules/([^/]+))/", pathNot: "^src/modules/([^/]+)/ui/internal/" },
      to: {
        path: "^src/modules/([^/]+)/ui/internal/",
        pathNot: "^src/modules/$2/",
      },
    },
    {
      name: "no-orphans",
      comment: "Arquivo que ninguém importa é código morto (exceto pontos de entrada do Next e testes).",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "\\.test\\.ts$",
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$",
          "^src/app/.*(page|layout|route|loading|error|not-found|manifest|robots|sitemap|icon|opengraph-image)\\.(ts|tsx)$",
          "^src/middleware\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // Não excluir node_modules aqui: isso apaga também as ARESTAS para pacotes,
    // e regras como "rota não importa @prisma/client" deixariam de enxergá-las.
    exclude: { path: ["^\\.next/"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".d.ts"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
