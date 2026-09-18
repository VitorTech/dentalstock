/**
 * Architecture rules checked by `npm run arch`.
 *
 * Every rule here is a decision described in ARCHITECTURE.md. If one of them
 * needs an exception, the conversation is about the architecture — not about
 * silencing the checker.
 */

/**
 * Module order: each one may only depend on those that come BEFORE it.
 * E.g. `inventory` uses `catalog`; `catalog` never uses `inventory`.
 */
const MODULE_ORDER = ["account", "identity", "catalog", "inventory", "clinical", "analytics"];

const moduleOrderRules = MODULE_ORDER.map((name, index) => {
  const later = MODULE_ORDER.slice(index + 1);
  return later.length === 0
    ? null
    : {
        name: `module-order:${name}`,
        comment: `"${name}" must not depend on later modules (${later.join(", ")}).`,
        severity: "error",
        from: { path: `^src/modules/${name}/` },
        to: { path: `^src/modules/(${later.join("|")})/` },
      };
}).filter(Boolean);

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "Cycles make load order fragile and couple what should stay independent.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // ── Layers inside each module ─────────────────────────────────────────────
    {
      name: "domain-is-pure",
      comment:
        "The domain is pure code: it only depends on other domains. No application, adapters, UI, framework or libraries.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+|shared)/domain/", pathNot: "\\.test\\.ts$" },
      to: {
        pathNot: ["^src/(modules/[^/]+|shared)/domain/"],
      },
    },
    {
      name: "application-depends-on-ports-only",
      comment:
        "Use cases talk to the world through ports (interfaces). Concrete implementations are wired in the container.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+|shared)/application/", pathNot: "\\.test\\.ts$" },
      to: {
        pathNot: ["^src/(modules/[^/]+|shared)/(domain|application)/"],
      },
    },
    {
      name: "ui-stays-on-the-client-side",
      comment:
        "The UI imports no application, adapters, infrastructure or container: it talks to the server over HTTP only.",
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
      comment: "Adapters implement ports; they know nothing about UI, routes or the container.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+/adapters|shared/infrastructure)/" },
      to: { path: ["^src/(modules/[^/]+|shared)/ui/", "^src/app/", "^src/server/"] },
    },

    // ── Boundaries between modules ────────────────────────────────────────────
    ...moduleOrderRules,
    {
      name: "shared-knows-no-module",
      comment: "`shared` is everyone's base; if it needs a module, the code belongs in that module.",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "cross-module-through-barrels",
      comment:
        "From outside the module, domain and application are reached through index.ts — whatever is not exported there is an internal detail.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/[^/]+/(domain|application)/.+",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/(domain|application)/index\\.ts$"],
      },
    },
    {
      name: "outside-modules-through-barrels",
      comment: "Routes, pages and the container also enter domain and application through index.ts.",
      severity: "error",
      from: { path: "^src/(app|server)/" },
      to: {
        path: "^src/modules/[^/]+/(domain|application)/.+",
        pathNot: [
          "^src/modules/[^/]+/(domain|application)/index\\.ts$",
          // The container is the composition root: the only place that instantiates use cases.
          "^src/modules/[^/]+/application/use-cases/",
        ],
      },
    },
    {
      name: "only-container-wires-use-cases",
      comment: "Use cases and outbound adapters are instantiated only in src/server/container.ts.",
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

    // ── HTTP edge and server ──────────────────────────────────────────────────
    {
      name: "routes-are-thin",
      comment:
        "Routes only translate HTTP: access through route(), rules through the container, output through presenters. Never Prisma directly.",
      severity: "error",
      from: { path: "^src/app/api/" },
      to: { path: ["@prisma/client", "^src/modules/[^/]+/ui/", "^src/(app/_shell|shared/ui)/"] },
    },
    {
      name: "server-code-stays-out-of-module-ui",
      comment: "The container and server-side auth must not be imported by module components.",
      severity: "error",
      from: { path: "^src/(modules|shared)/" },
      to: { path: "^src/server/" },
    },
    {
      name: "module-ui-does-not-know-the-shell",
      comment: "The shell (header, menu) composes the screens; module screens do not depend on it.",
      severity: "error",
      from: { path: "^src/modules/" },
      to: { path: "^src/app/" },
    },
    {
      name: "feature-internals-are-private",
      comment:
        "ui/internal is a feature's core: only that feature may enter. It is what makes the rest of its ui a real public API.",
      severity: "error",
      from: { path: "^src/(app|shared|modules/([^/]+))/", pathNot: "^src/modules/([^/]+)/ui/internal/" },
      to: {
        path: "^src/modules/([^/]+)/ui/internal/",
        pathNot: "^src/modules/$2/",
      },
    },
    {
      name: "no-orphans",
      comment: "A file nobody imports is dead code (except Next entry points and tests).",
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
    // Do not exclude node_modules here: that also erases the EDGES to packages,
    // and rules such as "a route must not import @prisma/client" would go blind.
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
