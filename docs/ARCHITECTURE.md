# HealthAI — Arquitetura

## Visão geral

Três aplicações, um servidor como centro de gravidade:

```
┌─────────────────────┐         ┌──────────────────────────────────────┐
│  sync-app (Android) │  Wi-Fi  │  server (PC local — Python/FastAPI)  │
│  Expo + Health      │ ──────► │                                      │
│  Connect            │  REST   │  api → normalization → repositories  │
└─────────────────────┘         │            │                         │
                                │            ▼                         │
┌─────────────────────┐         │        SQLite (WAL)                  │
│ dashboard (browser) │ ◄────── │            │                         │
│ React + TS          │  REST   │            ▼                         │
└─────────────────────┘         │      Analytics Engine                │
                                │            ▼                         │
                                │       Insight Engine                 │
                                │            ▼                         │
                                │   Recommendation Engine              │
                                │            ▼                         │
                                │   AI Engine (adapter) ─► Ollama /    │
                                │                          Anthropic / │
                                │                          OpenAI /    │
                                │                          Gemini      │
                                └──────────────────────────────────────┘
```

O servidor roda no PC do usuário (`uvicorn`, porta 8000). O dashboard é build estático servido pelo próprio FastAPI. O sync-app fala com o servidor pelo IP local. Nada depende de nuvem.

## Componentes

### 1. Sync Engine (`sync-app/` + `server/app/api/sync.py`)

Responsabilidade única: mover dados brutos do Health Connect para o servidor. **Zero regra de negócio.**

- App Expo/React Native com `react-native-health-connect`.
- Lê registros do Health Connect: sleep, exercise sessions, heart rate, HRV, steps, weight, body composition, hydration, nutrition.
- Mantém **fila local persistente** (SQLite via expo-sqlite): captura sempre funciona, envio acontece quando o servidor estiver alcançável.
- Envia lotes para `POST /api/v1/sync/batch`, com payload **bruto do Health Connect** (a normalização é responsabilidade do servidor — se o algoritmo de normalização mudar, os dados brutos permitem reprocessar).
- Sincronização incremental: o app guarda `lastSyncTime` por tipo de registro e usa changes API do Health Connect quando disponível.
- Descoberta do servidor: IP configurado manualmente na primeira execução + mDNS como melhoria futura.

### 2. Protocolo de sync

```
POST /api/v1/sync/batch
Authorization: Bearer <token local, gerado pelo servidor na instalação>

{
  "device_id": "galaxy-s24-pedro",
  "records": [
    {
      "source": "health_connect",
      "record_type": "SleepSession",          // nome do tipo no Health Connect
      "external_id": "hc-uuid-123",           // id do registro na origem
      "payload": { ...registro bruto... }
    }
  ]
}

→ 200 { "accepted": 120, "duplicates": 15, "failed": 0 }
```

- **Idempotente**: reenviar o mesmo lote não duplica nada (dedup por `(source, external_id)` ou hash do payload; ver DATA_MODEL.md).
- O servidor grava o payload bruto em `raw_records`, depois o Normalization Engine produz `health_events`.
- Erros de normalização não rejeitam o lote: o registro bruto fica salvo com status `pending_normalization` para reprocesso.

### 3. Normalization Engine (`server/app/normalization/`)

Converte qualquer origem para o modelo interno único (ver DATA_MODEL.md).

- Um normalizer por fonte: `health_connect.py`, `bioimpedance.py`, `lab_results.py`, `manual.py`, `recipes.py`.
- Contrato: `Normalizer.normalize(raw: RawRecord) -> list[HealthEvent]`.
- Registrado num registry por `(source, record_type)`. Adicionar fonte nova = adicionar um normalizer, nada mais muda.
- Conversões obrigatórias: unidades → SI, timestamps → UTC, enums da origem → enums do domínio.
- Reprocessável: comando `uv run python -m app.normalization.reprocess` re-normaliza tudo a partir de `raw_records`.

### 4. Banco de dados (`server/app/repositories/` + `server/migrations/`)

- SQLite em WAL mode; caminho em `HEALTHAI_DB_PATH` (default `~/.healthai/healthai.db`).
- Acesso exclusivamente via repositórios (`EventRepository`, `MetricRepository`, `RecipeRepository`, ...). Interface dos repositórios definida em `domain/` com `Protocol` — implementação SQLite é um detalhe.
- SQLAlchemy Core (não ORM) com SQL portável. Nada específico de SQLite fora desta camada → migração futura para PostgreSQL é trocar a implementação dos repositórios e a connection string.
- Migrations: arquivos SQL numerados em `migrations/`, aplicados por um runner simples com tabela `schema_version`.

### 5. Analytics Engine (`server/app/engines/analytics/`)

Coração do sistema. Ver contratos completos em ENGINES.md. Regras estruturais:

- **Funções puras**: entram DataFrames/séries, saem métricas tipadas. Sem I/O dentro dos cálculos.
- Orquestrador (`AnalyticsService`) busca dados via repositórios, chama os cálculos, persiste resultados em `metric_snapshots`.
- Execução: on-demand (request da API) + job diário (recalcula o dia anterior após sync).
- Resultados cacheados por `(metric, period)` e invalidados quando chegam eventos novos no período.

### 6. Insight Engine (`server/app/engines/insights/`)

Transforma indicadores em conclusões declarativas ("Seu HRV caiu 12% após noites < 6h"). Regras versionadas em código, cada uma com `id`, condição e template de texto. Saída persistida em `insights`.

### 7. Recommendation Engine (`server/app/engines/recommendations/`)

Transforma insights em ações priorizadas ("durma antes das 23h hoje"; "aumente proteína em ~20 g"). Também determinístico.

### 8. AI Engine (`server/app/engines/ai/`)

- Interface única: `AIProvider.complete(system: str, messages: list[Message]) -> str` (+ streaming).
- Providers em `engines/ai/providers/`: `ollama.py` (default), `anthropic.py`, `openai.py`, `gemini.py`. Seleção via config. SDKs de IA só podem ser importados aqui.
- O contexto enviado à IA é montado pelo `ContextBuilder`: métricas, insights e recomendações **já calculados**. A IA nunca recebe dados brutos para calcular nada.
- Sem IA configurada, o sistema funciona 100% — o chat fica indisponível, o resto não muda.

### 9. Dashboard (`dashboard/`)

- React + TS + Vite; build estático servido pelo FastAPI em `/`.
- Um diretório por módulo de domínio (sono, futebol, academia, corpo, nutrição, exames, metas, tendências, comparativos, relatórios, IA, config).
- Client de API tipado gerado do OpenAPI do FastAPI (`npm run generate:api`).
- Apresenta o que a API entrega pronto. Nenhum cálculo de indicador no frontend.

## Fluxo de dados (fim a fim)

```
Galaxy Watch → Samsung Health → Health Connect
      → sync-app (fila local) → POST /sync/batch
      → raw_records (bruto, imutável)
      → Normalization Engine → health_events (fonte da verdade normalizada)
      → Analytics Engine → metric_snapshots
      → Insight Engine → insights
      → Recommendation Engine → recommendations
      → Dashboard (API REST)  /  AI Engine (chat, explicações)
```

Fontes sem app (bioimpedância, exames, receitas, dados manuais) entram por upload/formulário no dashboard → mesma pipeline a partir de `raw_records`.

## Decisões de arquitetura (ADR resumido)

| # | Decisão | Motivo |
|---|---|---|
| 1 | Servidor local + web, não app all-in-one | Analytics em Python (pandas/scipy); custo zero; offline first |
| 2 | Sync-app em Expo/RN, não Kotlin | Reuso de TypeScript; `react-native-health-connect` cobre a necessidade |
| 3 | Payload bruto enviado ao servidor; normalização no servidor | Permite reprocessar histórico quando normalizers evoluírem |
| 4 | SQLite Core + repositórios, não ORM | Portabilidade p/ PostgreSQL, SQL sob controle, desacoplamento exigido |
| 5 | `raw_records` + `health_events` append-only | Fonte da verdade preservada; indicadores recalculáveis para sempre |
| 6 | Ollama como provider default de IA | Gratuito, local, offline; nuvem é opt-in |
| 7 | Dashboard estático servido pelo FastAPI | Um processo só, zero infra extra |

## Segurança

- Servidor escuta na rede local; token bearer estático gerado na instalação para o sync-app.
- Banco e dados nunca saem da máquina (exceto contexto mínimo enviado a provider de IA remoto, se o usuário optar).
- Backup: cópia do arquivo SQLite + `raw_records` é suficiente para restaurar tudo.
