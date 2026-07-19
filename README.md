# HealthIA

> Plataforma pessoal de inteligência em saúde. Transforma medições em decisões.

PWA mobile-first, sempre acessível, que unifica dados do Galaxy Watch 8 / Samsung Health (via Health Connect), bioimpedância, exames laboratoriais e nutrição, e responde continuamente:

> **"O que devo fazer hoje para melhorar minha saúde amanhã?"**

## Documentação

- [`CLAUDE.md`](CLAUDE.md) — guia do projeto (princípios, stack, convenções)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — componentes e fluxo de dados
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — modelo de dados e schema SQL
- [`docs/ENGINES.md`](docs/ENGINES.md) — contratos dos engines
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — fases de implementação
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — fluxo de trabalho e conventional commits
- [`notas/`](notas/) — registro de sessões, pendências e ADRs

## Stack

Next.js + TypeScript + Tailwind (PWA na Vercel) · Supabase (Postgres + Auth) · Analytics em TS puro (o coração do sistema) · Expo/React Native (sync Android via Health Connect) · IA plugável (Gemini free tier default).

## Começando

Ver `docs/ROADMAP.md` — o desenvolvimento inicia pela **Fase 0**.
