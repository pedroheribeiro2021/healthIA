# ADR-003 — AI Engine implementa os 3 providers via `fetch` direto às APIs REST, não os SDKs oficiais

**Data:** 2026-07-22 · **Status:** aceita · **Decisor:** Claude Code (Fase 6)

## Contexto

`docs/ENGINES.md` já definia o contrato do AI Engine desde antes da Fase 6: adapter plugável com `AIProvider { name, complete, stream }`, providers em `engines/ai/providers/` (Gemini default/free tier, Anthropic, OpenAI), "SDKs de IA só aqui". O contrato não especificava se "aqui" significava usar os SDKs oficiais (`@google/genai`, `@anthropic-ai/sdk`, `openai`) ou chamadas HTTP cruas.

## Decisão

Cada provider (`engines/ai/providers/{gemini,anthropic,openai}.ts`) chama a API REST do fornecedor diretamente via `fetch` global — sem nenhuma dependência de SDK. Um parser SSE compartilhado (`engines/ai/providers/sse.ts`) extrai as linhas `data:` de qualquer um dos três streams (framing SSE é idêntico entre eles; só o JSON do delta difere por provider).

## Motivo

- **Zero dependências novas** pra um app de usuário único: os 3 SDKs somados adicionam peso de bundle/instalação sem necessidade real — `fetch` já cobre POST + streaming via `ReadableStream`, ambos padrão Web API disponíveis em Next.js Route Handlers.
- Mantém "SDKs de IA só em `engines/ai/providers/`" **trivialmente verdadeiro por construção** (não há SDK nenhum a vazar pra fora dali).
- Testabilidade: os testes unitários (`gemini.test.ts`, `anthropic.test.ts`, `openai.test.ts`) mockam `global.fetch` diretamente, sem precisar de mocks de SDK.

## Consequências

Positivas: menos superfície de dependência, adapter mais fácil de auditar (todo request HTTP é explícito no código, sem camada de SDK escondendo detalhes).

Negativas / mitigação:
- Sem os helpers de retry/parsing de erro dos SDKs oficiais — cada provider trata erro manualmente (`response.ok` → `Error` com status + corpo). Se isso se mostrar frágil em uso real, revisitar.
- Formato de request/response de cada API precisa ser mantido manualmente se o fornecedor mudar o contrato REST (SDKs absorveriam isso). Aceitável: as 3 APIs REST são estáveis e versionadas (`anthropic-version`, `v1beta` do Gemini, `v1` da OpenAI).

## Decisão relacionada: modelo default do Gemini

`Pendencias.md` já listava "modelo Gemini do free tier a usar no chat" como decisão em aberto. Resolvido com um default no código (`GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"` em `gemini.ts`), sobrescrevível via `GEMINI_MODEL` no ambiente — não travado em código caso o nome do modelo do free tier mude. Pedro deve validar esse nome no Google AI Studio ao configurar a chave (ver `Pendencias.md`).
