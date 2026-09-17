# Arquitetura

**Monólito modular**, com **arquitetura hexagonal (ports & adapters)** dentro de
cada módulo e a **regra de dependência** da Clean Architecture: as setas apontam
sempre para dentro — da interface e da infraestrutura para o domínio.

As regras deste documento **não são convenção**: `npm run arch`
([.dependency-cruiser.cjs](.dependency-cruiser.cjs)) falha o build quando
alguma é violada. Se uma regra atrapalha, discuta a regra — não a contorne.

## Visão geral

```
src/
├── app/                  Next.js: páginas (composição de telas) e rotas HTTP
│   ├── (app)/…/page.tsx  telas autenticadas — compõem componentes dos módulos
│   ├── _shell/           cabeçalho, menu lateral, rodapé, providers, service worker
│   └── api/…/route.ts    borda HTTP: acesso → caso de uso → presenter
├── server/               lado servidor compartilhado pelo Next
│   ├── container.ts      RAIZ DE COMPOSIÇÃO: único lugar que instancia adaptadores e casos de uso
│   ├── auth.ts           sessão atual e guardas para server components
│   └── http/route.ts     route(access, handler): acesso explícito e obrigatório por rota
├── modules/              um diretório por contexto de negócio (abaixo)
├── shared/               base comum a todos os módulos (não conhece nenhum)
└── middleware.ts         redireciona quem não tem cookie de sessão (sem acesso a banco)
```

### Módulos e ordem de dependência

Cada módulo só pode depender dos que vêm **antes** dele. Não existe seta para
trás — é isso que impede ciclos e mantém cada módulo compreensível sozinho.

```
shared ← account ← identity ← catalog ← inventory ← clinical ← analytics
```

| Módulo      | Responsabilidade                                                                 |
| ----------- | -------------------------------------------------------------------------------- |
| `shared`    | Erros, tipos base, value objects genéricos (Email, Money, Quantity…), HTTP, UI base |
| `account`   | A clínica (tenant) e suas preferências de tema                                    |
| `identity`  | Usuários, login, sessões/JWT, papéis e permissões, equipe                         |
| `catalog`   | Materiais, instrumentais, fornecedores, procedimentos; nível de estoque          |
| `inventory` | Livro-razão (movimentos), entrada, ajuste, validade e custo médio ponderado      |
| `clinical`  | Finalização de procedimentos, consulta com vários deles, estorno e histórico     |
| `analytics` | Painel (agrega catálogo, estoque e clínica — só lê)                               |

> Na dúvida sobre onde algo mora, pergunte **de quem é o dado que a regra lê**.
> `isLowStock` lê `stock` e `minStock`, atributos do material → `catalog`.
> `isExpiringSoon` é regra de controle de estoque → `inventory`.

### Camadas dentro de um módulo

```
modules/<nome>/
├── domain/               código PURO: entidades, value objects, políticas
│   └── index.ts          barrel — a API pública do domínio
├── application/
│   ├── ports.ts          interfaces que os casos de uso exigem (repositórios, gateways)
│   ├── use-cases/*.ts    regra de aplicação; fala só com portas
│   └── index.ts          barrel — exporta as portas
├── adapters/
│   ├── in/http/          presenters (entidade → JSON) e leitura de parâmetros
│   ├── in/<externo>/     receptores de webhook etc.
│   └── out/prisma/       repositórios e mapeadores (implementam as portas)
└── ui/                   componentes e hooks React do módulo (cliente)
```

| Camada         | Pode importar                                         | Não pode importar                                 |
| -------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `domain`       | domínios (o próprio, anteriores, `shared`)            | aplicação, adaptadores, UI, Next, Prisma, **qualquer pacote** |
| `application`  | domínio e aplicação (própria, anteriores, `shared`)   | adaptadores, UI, Next, Prisma, pacotes            |
| `adapters`     | tudo das camadas internas, Prisma, pacotes            | UI, `src/app`, `src/server`                        |
| `ui`           | domínio (tipos e políticas puras), outras `ui`, `shared/ui` | aplicação, adaptadores, infraestrutura, `src/server`, `src/app` |
| `app/api`      | `server/*`, presenters, `shared/infrastructure/http`  | Prisma, UI, casos de uso/adaptadores de saída diretamente |

Regras adicionais verificadas:

- **Sem ciclos** em nenhum nível.
- **Entre módulos, só pelos barrels**: `@/modules/catalog/domain`, nunca
  `@/modules/catalog/domain/entities`. O que não está no `index.ts` é detalhe
  interno e pode mudar sem aviso.
- **Só o container instancia** casos de uso, repositórios e o cliente Prisma.
- `shared` não conhece nenhum módulo; telas de módulo não conhecem o `_shell`.
- Arquivo que ninguém importa gera aviso (código morto).

## Front-end: feature-based

A interface segue a mesma divisão do servidor — **uma feature por módulo**. Não
existe pasta `components/` global: um componente mora na feature de que ele
fala, e `shared/ui` guarda só o que não tem dono (Spinner, SearchBar,
ErrorBanner, formatação).

```
src/app/(app)/materiais/page.tsx     COMPOSIÇÃO: layout da tela, estado da página
  ├── modules/inventory/ui/MaterialStockRow.tsx     componente da feature
  ├── modules/inventory/ui/api.ts                   ← operações e contratos de fio
  └── shared/ui/{SearchBar,ErrorBanner,format}      genérico, sem regra de negócio
```

### A camada de dados fica na feature

Cada feature declara suas operações em `ui/api.ts`: URL, corpo, tipo da
resposta. As telas chamam `listMaterials()` ou `registerEntry(...)`, nunca
`fetch("/api/...")`.

- **URL e formato em um lugar só.** Renomear um endpoint é uma edição no
  `api.ts` da feature, não uma caçada por `fetch(` no projeto.
- **Tipos de fio explícitos.** O que a API devolve NÃO é a entidade do domínio:
  data vira texto, e o custo vem nulo para quem não pode vê-lo. Tipos como
  `StockMovementView` e `ExecutionView` dizem isso na cara.
- **Leitura e escrita têm regras diferentes.** `apiGet` degrada para um valor
  padrão (uma lista que falha vira lista vazia, a tela não quebra); `apiSend`
  lança `ApiError` com a mensagem do servidor — escrita que falha em silêncio
  faz o usuário acreditar que salvou.
- Isso é verificado: o ESLint recusa `fetch` fora de `ui/api.ts`, e recusa
  `apiGet`/`apiSend` fora dessa camada.

### Fronteira pública sem barrel

`ui/internal/` é privado à feature (`npm run arch` barra quem entra de fora);
o resto da `ui` é a API pública. Não há `ui/index.ts`.

Isso foi **medido**, não suposto: ao experimentar um barrel com os componentes
do catálogo, uma tela que usava um único componente passou a carregar todos os
modais e linhas da feature — cerca de **+10 kB de First Load JS**. O barrel
organiza o import e engorda o bundle; em interface, o preço não compensa.

## Fluxo de uma requisição

```
fetch("/api/materials/123", PATCH)
  → app/api/materials/[id]/route.ts
      route("catalogManager", …)          acesso resolvido ANTES do handler (401/403)
      container.catalog.updateMaterial     caso de uso: valida com value objects,
                                           aplica política, chama a porta
      → PrismaMaterialRepository           adaptador de saída, sempre filtrando tenantId
      ← presenter                          allowlist de campos (custo removido por papel)
  ← NextResponse.json(...)                 erros de domínio → status HTTP em withErrorHandling
```

## Decisões que o código mantém

- **Validação na fronteira do domínio**, nos value objects: se existe uma
  instância, ela é válida. Caminhos `optional()` tratam "vazio" como ausência.
- **Multi-tenancy por discriminador**: toda porta recebe `tenantId`; um id de
  outra clínica simplesmente "não existe" (404, nunca 403 — não confirma existência).
- **Permissão decidida no servidor.** A UI esconde o que o papel não usa, mas
  quem barra é `route(access)` / o caso de uso; custo sai do DTO no presenter.
- **Saldo e movimento na mesma transação** — estoque alterado sem linha no
  extrato é o estado que o livro-razão existe para impedir.
- **Políticas de domínio servem aos dois lados.** São funções puras, então a
  tela usa a mesma regra do servidor (`isLowStock`, `needsExpiryAttention`,
  `summarizeCost`). As que leem datas aceitam `DateLike` (`Date` ou texto ISO),
  porque no cliente a data chega por JSON.
- **JWT HS256 em cookie httpOnly**, com sessão persistida como âncora de
  revogação.
- **Força bruta no login é contida por contador, não por CAPTCHA**: duas chaves
  (conta e IP), limites diferentes, bloqueio curto que expira sozinho. O limite
  por conta é deliberadamente folgado — apertá-lo transformaria a defesa em
  negação de serviço contra o usuário legítimo.
- **`server-only`** em `container.ts`: importar o servidor num componente de
  cliente quebra o build, não vaza em produção.

## Onde colocar código novo

| Preciso de…                                   | Vai em                                                          |
| --------------------------------------------- | --------------------------------------------------------------- |
| uma regra de negócio pura                     | `modules/<m>/domain/policies.ts` (+ teste ao lado)               |
| validar/normalizar um campo                   | value object em `domain/value-objects.ts` (ou `shared/domain`)   |
| uma operação do sistema                       | `application/use-cases/<assunto>.ts` + registrar no `container`  |
| ler/gravar dados                              | método na porta (`ports.ts`) + implementação em `adapters/out/prisma` |
| um endpoint                                   | `app/api/…/route.ts` com `route(access, …)` + presenter          |
| um componente de uma área                     | `modules/<m>/ui/`                                                 |
| chamar um endpoint                            | função em `modules/<m>/ui/api.ts` (+ o tipo da resposta)          |
| um detalhe interno de um componente           | `modules/<m>/ui/internal/`                                        |
| um componente genérico (sem regra de negócio) | `shared/ui/`                                                      |
| uma tela                                      | `app/(app)/<rota>/page.tsx`, compondo componentes de módulos      |

Checklist de um caso de uso novo: porta → caso de uso → teste com repositório
em memória (ver `clinical/application/use-cases/executions.test.ts`) →
adaptador Prisma → container → rota → presenter.

## Convenções

- Componentes React: `PascalCase.tsx`. Demais arquivos: `kebab-case.ts`
  (`use-me.ts`, `stock-movement.repository.ts`).
- Hooks: `use-*.ts`, exportando `useAlgo`.
- Testes ao lado do código: `*.test.ts`. Sem mocks de chamada — portas são
  interfaces, então os testes usam implementações em memória e verificam o
  **efeito** (o que foi gravado).
- Imports com alias `@/`; relativo só dentro da mesma pasta (`./`) ou uma acima.
- Comentários explicam **por quê**, não o quê.

## Qualidade

```bash
npm run verify     # typecheck + lint + arquitetura + testes (rode antes de todo commit/deploy)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (next/core-web-vitals + typescript-eslint)
npm run arch       # dependency-cruiser: camadas, ordem de módulos, barrels, ciclos
npm run test       # Vitest
npm run build      # build de produção (também roda lint e checagem de tipos das rotas)
```
