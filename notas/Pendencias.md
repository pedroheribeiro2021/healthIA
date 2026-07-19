# Pendências — HealthIA

## Ação do Pedro (bloqueiam o "pronto" da Fase 0)

- [ ] **Supabase: expor o schema `healthia` na Data API** (Project Settings → API → Exposed schemas, adicionar `healthia` à lista). Sem isso, o PostgREST não atende `.schema("healthia")` e todas as chamadas do app aos repositórios falham (o app está no ar, mas login autenticado ainda vai falhar na leitura/escrita até isso ser feito). O schema e as tabelas já existem — só falta essa exposição.
- [ ] **Supabase: criar a conta do Pedro** no projeto `rachaconta` (compartilhado). Hoje o projeto só tem ~95 usuários anônimos (de outros apps) — nenhuma conta com e-mail real. Criar via Dashboard → Authentication → Add user (e-mail + senha), ou por convite. A app não tem tela de cadastro de propósito.
- [ ] **Supabase: restringir RLS ao UUID do Pedro.** Depois que a conta existir, trocar o corpo de `healthia.is_authorized()` (nova migration) para comparar `auth.uid()` com o UUID fixo do Pedro, em vez de só checar "autenticado e não anônimo". Hoje a policy já bloqueia os ~95 usuários anônimos de outros apps do projeto, mas ainda aceitaria qualquer outra conta real que viesse a existir nesse projeto compartilhado.

## Resolvido em 2026-07-19 (sessão com Pedro logado no Vercel via browser)

- [x] Vercel: permissão de deploy — resolvido logando com a conta do Pedro no Chrome (a integração MCP/API seguia bloqueada com `403`, causa não identificada, mas deixou de ser necessária).
- [x] Vercel: repositório `pedroheribeiro2021/healthIA` conectado ao projeto `healthia` (Project Settings → Git) — `git push` na branch de produção já dispara deploy automático.
- [x] Vercel: env vars configuradas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — a última colada pelo próprio Pedro, nunca vista por mim). **Bug real encontrado**: ao criar múltiplas variáveis no mesmo formulário e alternar o toggle "Sensitive", a Vercel salvou o texto de *placeholder* do campo (ex.: `https://aBcDe.supabase.co`) como se fosse o valor real, em vez do que foi digitado — sem erro nem aviso. Só foi descoberto porque o deploy quebrou em runtime (`Error: Your project's URL and Key are required to create a Supabase client!`). Corrigido apagando e recriando as variáveis uma de cada vez, sem mexer no toggle depois de digitar. Vale desconfiar desse toggle no futuro; registrado em `Global/Infra-Cloud-Compartilhada.md` no vault.
- [x] App em produção, funcionando: `https://healthia-six.vercel.app` — redirect `/` → `/login` confirmado, sem erro 500.

## Decisão registrada (ver notas/ADR)

- Schema Supabase dedicado `healthia` dentro do projeto `rachaconta` (não um projeto Supabase novo — org já estava no limite de 2 projetos free). Detalhe em `notas/ADR/ADR-002-schema-compartilhado-supabase.md`.

## Depois (Fase 1)

- [ ] Fase 1 — ingestão manual + pipeline raw→events + PWA instalável

## Decisões pendentes

- [ ] Modelo Gemini do free tier a usar no chat (validar na Fase 6)
- [ ] Estratégia de backup: GitHub Action semanal com pg_dump (definir repo privado/artefato na Fase 0 ou 1)
