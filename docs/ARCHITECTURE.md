# HealthIA — Arquitetura

> v2 (nuvem). A v1 (servidor local Python) foi substituída — motivo e trade-offs em `notas/ADR/ADR-001-migracao-para-nuvem.md`.

## Visão geral

```
┌──────────────────────┐          ┌─────────────────────────────────────────┐
│ sync-app (Android)   │  HTTPS   │  web (Next.js na Vercel)                │
│ Expo + Health        │ ───────► │                                         │
│ Connect + fila local │          │  app/api (REST, thin)                   │
└──────────────────────┘          │    → normalization → repositories ──────┼──► Supabase
                                  │    → engines/analytics                  │    (Postgres
┌──────────────────────┐          │    → engines/insights                   │     + RLS
│ celular / desktop    │ ◄──────► │    → engines/recommendations            │     + Auth)
│ (PWA no navegador)   │  HTTPS   │    → engines/ai ──► Gemini/Anthropic/…  │
└──────────────────────┘          │  Vercel Cron: recálculo diário          │
                                  └─────────────────────────────────────────┘
```

- **Uma aplicação Next.js** concentra dashboard (PWA), API REST e engines. Sem servidor próprio pra manter.
- **Supabase** é o banco (Postgres), auth e storage de uploads (exames em PDF/imagem). Free tier.
- **Vercel** faz build/deploy a cada push e roda o cron diário de recálculo. Free tier (hobby).
- Nada depende do PC do Pedro estar ligado.

## Componentes

### 1. Sync Engine (`sync-app/` + `web/src/app/api/sync/`)

Responsabilidade única: mover dados brutos do Health Connect para a nuvem. **Zero regra de negócio.**

- App Expo/React Native com `react-native-health-connect`.
- Lê registros do Health Connect: sleep, exercise sessions, heart rate, HRV, steps, weight, body composition, hydration, nutrition.
- **Fila local persistente** (expo-sqlite): captura sempre funciona; envio quando houver rede (qualquer rede — não depende de Wi-Fi de casa).
- Sync incremental por `lastSyncTime`/changes API por tipo de registro; sync em background (expo-background-fetch) + botão manual.
- Payload enviado **bruto** — normalização é do servidor (permite reprocessar histórico quando os normalizers evoluírem).
- Auth: login único com a conta do Pedro (Supabase Auth); refresh token guardado com `expo-secure-store`.

**Limitações conhecidas do Health Connect (considerar na Fase 2):**
- Retenção de ~30 dias de histórico → instalar o sync-app o quanto antes; cada mês sem ele é histórico perdido para correlações.
- Sem push em tempo real: sync periódico em background (limites do Android) + ao abrir o app. Suficiente para consulta matinal.
- Métricas proprietárias da Samsung (ex.: energy score) não são expostas; as necessárias ao Analytics (sono com estágios, HRV, FC, treinos, peso, composição) são.
- Pré-requisito no aparelho: ativar Samsung Health → Health Connect.

### 2. Protocolo de sync

```
POST /api/v1/sync/batch
Authorization: Bearer <JWT Supabase>

{
  "device_id": "galaxy-s24-pedro",
  "records": [
    { "source": "health_connect",
      "record_type": "SleepSession",
      "external_id": "hc-uuid-123",
      "payload": { ...registro bruto... } }
  ]
}
→ 200 { "accepted": 120, "duplicates": 15, "failed": 0 }
```

- **Idempotente**: dedup por `(source, external_id)` e por hash do payload (ver DATA_MODEL.md). Reenviar lote não duplica.
- Registro bruto entra em `raw_records`; erro de normalização não rejeita o lote (fica `pending` para reprocesso).

### 3. Normalization Engine (`web/src/normalization/`)

- Um normalizer por fonte: `healthConnect.ts`, `bioimpedance.ts`, `labResults.ts`, `manual.ts`.
- Contrato: `normalize(raw: RawRecord): HealthEvent[]`; registry por `(source, recordType)`.
- Conversões obrigatórias: unidades → SI, timestamps → UTC, enums da origem → enums do domínio (schemas zod em `domain/`).
- Reprocessável: rota admin `POST /api/v1/admin/reprocess` re-normaliza a partir de `raw_records`.

### 4. Banco (Supabase) e repositórios (`web/src/repositories/`)

- Postgres com **RLS ligado em tudo**: apenas o usuário autenticado (Pedro) lê/escreve; `anon` não acessa nada.
- Acesso exclusivamente via repositórios (`eventRepository`, `metricRepository`, ...). Interfaces em `domain/`; a implementação usa `@supabase/supabase-js` — único lugar do web app que o importa.
- Rotas server-side usam client com session do usuário; cron usa `service_role` (nunca exposto ao cliente).
- Migrations: SQL versionado em `web/supabase/migrations/` via supabase CLI. Nunca editar migration aplicada.
- Portabilidade: SQL padrão sempre que possível; recursos específicos (RLS, jsonb) confinados a migrations e repositórios.

### 5. Analytics Engine (`web/src/engines/analytics/`)

Coração do sistema. Contratos em ENGINES.md. Regras estruturais:

- **Funções puras**: entram eventos/séries tipados, saem métricas tipadas. Sem I/O nos cálculos.
- Orquestrador (`analyticsService`) busca dados via repositórios, executa calculators, persiste em `metric_snapshots`.
- Execução: on-demand (rotas de API) + **Vercel Cron diário 06:00 America/Sao_Paulo** (recalcula o dia anterior, atualiza `daily_summary`, roda insights e recommendations).
- Cache por `(metric, period)` invalidado quando chegam eventos novos no período.

### 6. Insight Engine (`web/src/engines/insights/`)

Indicadores → conclusões declarativas, com `evidence` numérica. Regras versionadas em código.

### 7. Recommendation Engine (`web/src/engines/recommendations/`)

Insights + metas → ações priorizadas (máx. 3 abertas por dia no dashboard). Determinístico.

### 8. AI Engine (`web/src/engines/ai/`)

- Interface `AIProvider` + providers em `engines/ai/providers/` (`gemini.ts` default — free tier, `anthropic.ts`, `openai.ts`). SDKs de IA só aqui. Chamadas sempre server-side.
- `ContextBuilder` monta o contexto com métricas/insights/recomendações **já calculados**. IA nunca recebe dados brutos para calcular.
- Sem provider configurado o app funciona 100% — só o chat fica indisponível.

### 9. Dashboard (PWA, `web/src/app` + `web/src/modules/`)

- Mobile-first (o uso principal é o celular); instalável (manifest + service worker), ícone na home screen.
- Um diretório por módulo de domínio; gráficos com Recharts.
- Server Components para leitura; mutações via rotas de API. Nenhum indicador calculado no cliente.

## Fluxo de dados (fim a fim)

```
Galaxy Watch → Samsung Health → Health Connect
  → sync-app (fila local) → POST /api/v1/sync/batch
  → raw_records (bruto, imutável)
  → Normalization → health_events (fonte da verdade normalizada)
  → Analytics → metric_snapshots + daily_summary
  → Insights → insights   → Recommendations → recommendations
  → PWA (dashboard)  /  AI Engine (chat, explicações)
```

Fontes sem app (bioimpedância, exames, receitas, dados manuais) entram por upload/formulário no PWA → mesma pipeline a partir de `raw_records`.

## Auth e segurança

- Supabase Auth, conta única (Pedro). Cadastro desabilitado; middleware do Next.js protege todas as rotas.
- RLS nega tudo por padrão; policies liberam apenas o `user_id` do Pedro.
- Segredos em env da Vercel / EAS; nada no repo. `service_role` só em código server-side (cron/admin).
- Dados de saúde: criptografia em repouso e trânsito pelo Supabase; provider de IA recebe apenas o contexto mínimo já agregado.
- Backup: `pg_dump` semanal via GitHub Action (artefato privado) — free tier do Supabase não tem PITR.

## Decisões de arquitetura

ADRs em `notas/ADR/`. Fundação:

| # | Decisão | Motivo |
|---|---|---|
| ADR-001 | Nuvem (Vercel + Supabase) em vez de servidor local | Acesso de qualquer lugar pelo celular, sempre no ar, custo zero, padrão dos outros apps do Pedro |
| — | Analytics em TypeScript puro dentro do Next.js | Uma linguagem só, testável com vitest, roda em serverless |
| — | Payload bruto na nuvem; normalização no servidor | Reprocessar histórico quando normalizers evoluírem |
| — | `raw_records` + `health_events` append-only | Fonte da verdade preservada; indicadores recalculáveis |
| — | Supabase atrás de repositórios | Trocável por Postgres puro/outro BaaS sem tocar engines |
| — | Gemini free tier como provider default de IA | Custo zero; adapter mantém Anthropic/OpenAI plugáveis |
