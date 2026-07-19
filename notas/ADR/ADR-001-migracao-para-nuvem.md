# ADR-001 — Migração da arquitetura local para nuvem (Vercel + Supabase)

**Data:** 2026-07-19 · **Status:** aceita · **Decisor:** Pedro

## Contexto

A v1 da arquitetura (mesma data) previa servidor local em Python/FastAPI + SQLite no PC do Pedro, com dashboard web servido na rede de casa e princípio "offline first" herdado do documento de visão.

Ao revisar, Pedro identificou que isso contradiz o uso real pretendido: o HealthIA é consultado principalmente **pelo celular, em qualquer lugar, a qualquer hora** ("sistema operacional de saúde"). Com servidor local: sem acesso fora de casa e dependência do PC ligado. Alternativa Tailscale foi considerada e descartada (mantém dependência do PC ligado).

## Decisão

Migrar para nuvem com free tiers, no padrão dos outros apps do Pedro (rachaconta, zerosheet-finance):

- **Next.js (App Router) + TS + Tailwind** como aplicação única (PWA mobile-first + API + engines), deploy na **Vercel**.
- **Supabase** para Postgres + Auth + Storage, com RLS em tudo.
- **Analytics Engine em TypeScript puro** (funções puras + vitest) em vez de Python/pandas — estatística própria em `analytics/stats/`.
- **Vercel Cron** para o recálculo diário.
- IA default passa de Ollama (local, inviável na nuvem) para **Gemini free tier**, mantendo o adapter plugável.
- sync-app continua Expo + Health Connect, agora enviando à API na nuvem de qualquer rede (melhora: não depende de Wi-Fi de casa).

## Princípio revisado

"Offline first" → **"Acessível em qualquer lugar, resiliente a offline"**: PWA sempre no ar; fila local no sync-app tolera falta de rede; app funciona 100% sem IA.

## Consequências

Positivas: acesso universal, sempre no ar, zero manutenção de servidor, deploy contínuo, stack única (TS), padrão já dominado.

Negativas / mitigação:
- Dados de saúde na nuvem → RLS negando tudo por padrão, conta única, segredos fora do repo, contexto mínimo para IA.
- Sem pandas/scipy → estatística necessária (Spearman, Theil-Sen, médias móveis) é implementável em TS puro com testes; complexidade aceitável.
- Dependência de free tiers (Vercel/Supabase) → dados exportáveis (`pg_dump` semanal via GitHub Action); repositórios isolam o Supabase, permitindo migrar para Postgres puro.
- Cron limitado no hobby da Vercel (1×/dia) → suficiente para o recálculo diário; on-demand cobre o resto.

## Alternativas descartadas

1. **Servidor local + Tailscale** — resolve acesso remoto, mas PC precisa ficar ligado; manutenção contínua.
2. **Só rede local (v1)** — sem acesso fora de casa; incompatível com o uso pretendido.
