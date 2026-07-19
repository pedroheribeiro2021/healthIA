# Pendências — HealthIA

## Agora (Fase 0 — Fundação, ver docs/ROADMAP.md)
- [ ] Criar projeto Supabase (free tier) e projeto Vercel ligado ao repo
- [ ] Scaffold `web/` (Next.js + TS + Tailwind + vitest + PWA base) com deploy no ar
- [ ] Migration 001 (schema completo do DATA_MODEL.md) + RLS + triggers de proteção
- [ ] Supabase Auth: conta do Pedro, cadastro desabilitado, middleware protegendo rotas
- [ ] Repositórios (interfaces em `domain/` + implementação Supabase)
- [ ] Scaffold `sync-app/` (Expo, só estrutura)

## Depois
- [ ] Fase 1 — ingestão manual + pipeline raw→events + PWA instalável

## Decisões pendentes
- [ ] Nome/domínio do app na Vercel (healthia.vercel.app disponível?)
- [ ] Modelo Gemini do free tier a usar no chat (validar na Fase 6)
- [ ] Estratégia de backup: GitHub Action semanal com pg_dump (definir repo privado/artefato na Fase 0 ou 1)
