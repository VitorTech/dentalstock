# DentalStock

Controle de estoque para clínicas odontológicas, organizado **por procedimento**:
o material sai do estoque quando o atendimento é finalizado, e todo movimento
fica registrado com autor, data e motivo.

Aplicação **multi-clínica** em **Next.js 14** (App Router + TypeScript) com
**PostgreSQL** e **Prisma**. Cada clínica tem seu catálogo e sua equipe; o
isolamento é imposto na assinatura de toda porta de repositório.

> Projeto pessoal, usado também como estudo de arquitetura: monólito modular com
> hexagonal por dentro, e as fronteiras verificadas automaticamente
> (`npm run verify`). Os detalhes estão em **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## O que ele faz

### Procedimentos e consumo

- Procedimentos agrupados por especialidade, com busca por nome, categoria ou
  material.
- Cada procedimento tem sua lista de **materiais** (consumíveis) e
  **instrumentais** (reutilizáveis), com quantidade ajustável por clínica.
- **Duplicar procedimento** com toda a lista, para criar variações.
- Ao **finalizar**, o estoque é baixado de forma transacional — ou tudo, ou
  nada; faltando material, a resposta diz exatamente o que faltou e nada é
  descontado. **Material é consumido, instrumental não** — este entra no
  histórico como checklist.
- **Consulta com vários procedimentos**: marque quantos foram feitos no mesmo
  atendimento e finalize juntos, numa transação só.

### Estoque

- **Livro-razão**: nenhum saldo muda sem movimento registrado — tipo, autor,
  data, motivo e custo.
  - `RESTOCK` — entrada por compra
  - `CONSUMPTION` — baixa por finalização
  - `ADJUSTMENT` — correção manual, com **motivo obrigatório**
  - `REVERSAL` — devolução por estorno
- **Entrada de material** com quantidade, custo da nota e observação. Informando
  o preço, o custo do material é recalculado por **média ponderada**.
- **Estorno de finalização**: devolve os materiais e marca o registro como
  estornado — sem apagá-lo, e removendo-o dos números do painel.
- **Validade de lote**, com alerta de vencido / vence em até 30 dias.
- **Extrato** filtrável por tipo, período e material.

### Custo

- Custo unitário por material (opcional — a clínica pode adotar aos poucos).
- Custo **congelado** na finalização: mudar o preço de compra hoje não reescreve
  quanto custou um atendimento do mês passado.
- Painel com custo do período, por dia, por especialidade e **custo médio por
  procedimento**.
- Havendo material sem preço, o total é apresentado como **parcial**, nunca como
  se fosse completo.

### Equipe e acesso

- Papéis: `OWNER`, `MEMBER` (acesso completo) e `ASSISTANT` (auxiliar).
- O **auxiliar** finaliza procedimentos e dá entrada no estoque, mas não altera
  o catálogo, não corrige saldo à mão e **não enxerga custo** — o valor é
  removido da resposta no servidor, não escondido na tela.
- Convite, troca de papel e redefinição de senha pela própria clínica. Toda
  alteração de papel ou senha encerra as sessões abertas do usuário.
- **Limite de tentativas de login** por conta e por origem, com bloqueio
  temporário e `Retry-After` na resposta.

### Outros

- **Histórico** com autor, custo e exportação em **CSV** (uma linha por item).
- Tema claro/escuro e cor de destaque por clínica.

## Stack

- Next.js 14 (App Router, Route Handlers como API)
- TypeScript + TailwindCSS
- Prisma ORM + PostgreSQL 16 (via Docker Compose)
- Vitest, ESLint e dependency-cruiser

## Como rodar

Pré-requisitos: Node.js 18+, Docker e Docker Compose.

```bash
npm install
cp .env.example .env   # ajuste JWT_SECRET
npm run setup          # sobe o banco, aplica as migrações e popula o catálogo
npm run dev
```

Acesse **http://localhost:3000**. O seed cria uma clínica de exemplo e o
primeiro acesso (`admin@clinica.com` / `admin123` por padrão — troque em
`.env`).

Outras clínicas e usuários:

```bash
npm run tenant:create -- "Clínica Sorriso" sorriso dono@sorriso.com "SenhaForte123" "Dra. Ana"
```

```bash
npm run user:create -- <slug-da-clinica> <email> <senha> "<Nome>" [MEMBER|ASSISTANT]
```

Parar o banco: `npm run db:down`. Inspecionar os dados: `npm run prisma:studio`.

## Qualidade

```bash
npm run verify   # typecheck + lint + regras de arquitetura + testes
```

O `arch` falha se um domínio importar Prisma, se uma tela importar o container
ou se um módulo depender de outro que vem depois dele na ordem definida em
[ARCHITECTURE.md](ARCHITECTURE.md).

Pontos de segurança que o código mantém:

- **Permissão é decidida no servidor.** A interface esconde o que o papel não
  pode usar, mas quem barra é o acesso declarado da rota — e o custo é removido
  do DTO, não da tela.
- **Isolamento multi-clínica** por `tenantId` em toda porta; recurso de outra
  clínica responde 404, nunca 403 — 403 confirmaria que o registro existe.
- **JWT (HS256) em cookie httpOnly**, com sessão persistida como âncora de
  revogação: o token só vale enquanto o `jti` correspondente estiver ativo.
- **Limite de tentativas de login** por conta e por IP, com contador no banco
  (sobrevive a reinício e vale para todas as instâncias).
- **SQL injection**: todo acesso passa pela API tipada do Prisma, com comandos
  parametrizados. O projeto não usa `$queryRawUnsafe` nem `$executeRawUnsafe`.
- **CSV injection**: a exportação neutraliza células iniciadas por `=`, `+`,
  `-` ou `@`, que o Excel interpretaria como fórmula.

## Modelo de dados (resumo)

- **Tenant**: a clínica. Todo dado pertence a uma e as consultas filtram por ela.
- **User / Session / LoginThrottle**: acesso, revogação e limite de tentativas.
- **Material**: item de estoque (unidade, imagem, saldo, mínimo, custo, validade).
- **Instrument**: instrumental reutilizável — tem inventário, mas não é consumido
  e por isso não tem estoque mínimo.
- **Supplier**: fornecedor, usado na reposição.
- **Procedure / ProcedureMaterial / ProcedureInstrument**: o procedimento e sua
  lista, com a quantidade personalizada por clínica.
- **ProcedureExecution / ProcedureExecutionItem**: histórico do que foi
  finalizado, com nomes e custos em snapshot para não mudar retroativamente.
- **StockMovement**: o livro-razão do estoque.

## Próximos passos

- Alerta ativo de reposição e validade por e-mail (hoje o aviso vive no painel).
- Controle por lote, para quem mantém mais de um lote do mesmo material.
- Testes de integração cobrindo a borda HTTP (hoje os testes são de domínio e
  de aplicação, com repositórios em memória).
