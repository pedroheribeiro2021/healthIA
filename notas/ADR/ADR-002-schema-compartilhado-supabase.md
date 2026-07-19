# ADR-002 — HealthIA usa um schema dedicado no projeto Supabase `rachaconta`, não um projeto novo

**Data:** 2026-07-19 · **Status:** aceita · **Decisor:** Pedro

## Contexto

ADR-001 definiu Supabase como banco/auth/storage do HealthIA. Ao criar o projeto na Fase 0, a organização Supabase do Pedro (`pedroheribeiro2021's Org`) já estava no limite de 2 projetos ativos no plano free (`rachaconta` e `zerosheet-judotracker`). `create_project` falhou com esse limite.

## Decisão

Reaproveitar o projeto Supabase `rachaconta` (Postgres compartilhado com outros apps do Pedro, incluindo um app de "pelada" que já roda ali sob prefixo `fi_*`), mas isolar o HealthIA num **schema Postgres dedicado — `healthia`** — em vez de usar `public`.

- Todas as 11 tabelas do DATA_MODEL.md vivem em `healthia.*`, não em `public.*`.
- RLS habilitado em todas, com policy restrita por `healthia.is_authorized()` (função dedicada, não reutiliza nada de `public`).
- Repositórios (`web/src/repositories/supabase/*Client.ts`) configuram `db: { schema: "healthia" }` no client Supabase — nunca tocam `public`.

## Achado durante a implementação: auth compartilhado exige RLS mais restritiva

O projeto `rachaconta` usa `auth.signInAnonymously()` extensivamente (~95 usuários anônimos até 2026-07-19, provavelmente do app de pelada). No Supabase, uma sessão anônima carrega `role = 'authenticated'` no JWT — então uma policy `to authenticated using (true)` teria vazado os dados do HealthIA para qualquer usuário anônimo de outro app nesse mesmo projeto.

Mitigação aplicada (`healthia_003_restrict_to_non_anonymous.sql`): a função `healthia.is_authorized()` exige `auth.role() = 'authenticated'` **e** `is_anonymous = false` no JWT. Isso bloqueia os ~95 usuários anônimos existentes. Ainda não restringe a um `auth.uid()` específico do Pedro porque a conta dele não existia neste projeto no momento da migration — ver pendência em `notas/Pendencias.md`. Assim que existir, uma nova migration deve travar a função no UUID fixo do Pedro, fechando de vez a possibilidade de qualquer outra conta real do projeto acessar dados do HealthIA.

## Consequências

Positivas: custo zero (sem upgrade de plano nem pausar projeto existente); nenhuma mudança nos outros apps do Pedro; isolamento por schema é limpo de derrubar/recriar sem tocar em `public`.

Negativas / mitigação:
- Auth compartilhado entre apps do mesmo projeto → mitigado pela função `is_authorized()` e, em seguida, pelo pin no `auth.uid()` do Pedro.
- Schema `healthia` precisa ser adicionado manualmente à lista de "Exposed schemas" nas configurações da Data API do projeto (Dashboard → Project Settings → API) — não há ferramenta automatizada para isso; é uma configuração de plataforma, não SQL. Até lá, chamadas do app aos repositórios falham. Ver `notas/Pendencias.md`.
- `generate_typescript_types` só enxerga schemas expostos (hoje só `public`), então `web/src/repositories/supabase/databaseTypes.ts` foi escrito à mão espelhando as migrations. Regenerar/atualizar manualmente a cada migration nova até a exposição do schema permitir gerar automaticamente.

## Alternativas descartadas

1. **Upgrade da organização para plano pago** — resolve o limite, mas custo recorrente não justificado nesta fase (ADR-001 é explícito sobre free tier).
2. **Pausar `zerosheet-judotracker` para abrir vaga de projeto free** — mexe em outro projeto ativo do Pedro sem necessidade; schema dedicado resolve sem esse efeito colateral.
3. **Usar schema `public` do `rachaconta` com prefixo de tabela** (ex.: `healthia_raw_records`) — funcionaria, mas mistura namespaces no mesmo schema; schema dedicado dá isolamento mais claro e permite `drop schema healthia cascade` sem risco de atingir tabelas de outros apps.
