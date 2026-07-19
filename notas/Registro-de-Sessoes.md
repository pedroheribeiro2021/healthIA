# Registro de Sessões — HealthIA

Atualizado ao fim de cada sessão de desenvolvimento (convenção do vault Claude-Memoria).

---

## 2026-07-19 — Fundação do projeto (Cowork)

**Objetivo:** definir arquitetura/stack e deixar o repositório pronto para o desenvolvimento com Claude Code.

**Realizado:**
- Decisão de arquitetura: servidor local (Python/FastAPI + SQLite) + dashboard web (React/TS) + sync-app Android (Expo + Health Connect). IA plugável com Ollama como default. Custo zero, offline first.
- Documentação completa criada: `CLAUDE.md`, `docs/ARCHITECTURE.md` (componentes, protocolo de sync, ADRs), `docs/DATA_MODEL.md` (schema SQL, raw_records + health_events append-only), `docs/ENGINES.md` (contratos, Recovery Score v1, 7 regras de insight), `docs/ROADMAP.md` (fases 0–6 com critérios de pronto).
- Repositório git inicializado com conventional commits (hook `commit-msg` validando) e `CONTRIBUTING.md`.
- Vault Obsidian atualizado (`Projetos/README.md`).

**Decisões:**
- Payload bruto do Health Connect é enviado ao servidor; normalização acontece no servidor (permite reprocessar histórico).
- SQLAlchemy Core (não ORM) + repositórios com Protocol → troca futura para PostgreSQL sem dor.
- Dados de saúde (`*.db`) nunca versionados no git.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — começar pela Fase 0 do roadmap.
