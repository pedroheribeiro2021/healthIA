# ADR-006 — Import de exame passa a ter um caminho assistido por IA (extração de foto do laudo)

**Data:** 2026-08-22 · **Status:** aceita · **Decisor:** Pedro (confirmado via pergunta direta), implementado por Claude Code

## Contexto

`domain/labResult.ts` documentava explicitamente, desde a Fase 5: "sem parsing automático de PDF/imagem (a IA nunca calcula/extrai indicador, CLAUDE.md)". Na prática isso significava digitar cada marcador de um laudo na mão — Pedro reportou isso como um dos motivos do app estar "inútil" no uso diário (junto com outros 8 problemas, ver `notas/Registro-de-Sessoes.md` da sessão de 2026-08-22).

## Decisão

Adiciona um caminho assistido por IA em `/exames` (`LabImportFromFile.tsx`): o Pedro fotografa/faz print do laudo, a IA extrai marcador/valor/unidade/faixa de referência em JSON estruturado, e **cada linha é revisada e editável na tela antes de qualquer POST real** em `/api/v1/imports/lab` — o mesmo endpoint e o mesmo schema do fluxo manual existente, que continua ali como alternativa (obrigatória pra PDF, já que a extração só aceita imagem).

`AIProvider` (contrato de `docs/ENGINES.md`) ganhou um método novo, `completeWithImage(system, prompt, image)`, implementado nos 3 providers (Gemini/Anthropic/OpenAI, todos via REST — ADR-003) com o formato de bloco de imagem nativo de cada um. Não é streaming (o chamador precisa da resposta inteira pra `JSON.parse`).

## Por que isso não fere o princípio "IA nunca calcula indicador"

O princípio (`CLAUDE.md`) existe pra impedir a IA de **computar** métricas/scores que deveriam ser código determinístico e testável (Analytics Engine). Ler um número já impresso num documento e transcrever pra JSON não é cálculo — é OCR/transcrição, o mesmo trabalho que o Pedro faria digitando. A IA nunca decide se um valor está "fora da faixa" (isso continua sendo `lab_out_of_range`, regra do Insight Engine) nem grava nada sozinha: o resultado da extração é só uma sugestão pré-preenchida, sempre confirmada por humano antes de virar dado real — mesmo padrão de confiança zero em IA não supervisionada já usado no chat (`/chat` não persiste, nunca age sozinho).

## Consequências

Positivas: destrava o import de exame de verdade (motivo original de `/exames` existir era ativar `lab_out_of_range`, que dependia de ter dado).

Negativas / mitigação:
- Só funciona com provider de IA configurado (`GEMINI_API_KEY` etc. — `notas/Pendencias.md`) — sem isso, a rota `/api/v1/ai/extract-exam` responde 503 e a UI orienta a usar o formulário manual. Mesmo comportamento de degradação do resto do app sem IA.
- Só aceita imagem (jpeg/png/webp), não PDF — Claude/OpenAI/Gemini têm suporte a PDF cada um com mecanismo próprio e menos estável entre providers; escopo deliberadamente restrito a foto/print pra manter os 3 providers com o mesmo contrato. PDF continua indo pelo formulário manual.
- Extração pode errar (letra ruim, marcador fora do padrão) — por isso a revisão linha a linha é obrigatória, não um detalhe de UX opcional.
