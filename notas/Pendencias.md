# Pendências — HealthIA

## Ação do Pedro (bloqueiam o app funcionar de ponta a ponta)

- [ ] **Vercel: liberar permissão de deploy.** A integração usada pelo Claude Code recebeu `403 forbidden` tanto para deployment de produção quanto de preview no projeto `healthia` (time `pedroheribeiro2021's projects`), mesmo o projeto já existindo. Verificar papel/permissões da conta em Vercel → Team Settings → Members, ou reautorizar a integração. Depois disso, o deploy pode ser refeito.
- [ ] **Vercel: conectar o repositório GitHub ao projeto `healthia`** (Project Settings → Git) para que `git push` na `main` dispare deploy automático, como descrito no CLAUDE.md. O primeiro deploy foi feito via upload direto de arquivos (sem git), então essa conexão ainda não existe.
- [ ] **Vercel: configurar as env vars do projeto** (Project Settings → Environment Variables):
  - `NEXT_PUBLIC_SUPABASE_URL=https://grsqjzrgngpyckcfkxon.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_odNQSisZtRoEZsUnAf7cYw_Rpu7mAun`
  - `SUPABASE_SERVICE_ROLE_KEY=` (copiar do Supabase Dashboard → Project Settings → API; nunca peço isso a ferramentas automáticas por ser secreto)
- [ ] **Supabase: expor o schema `healthia` na Data API** (Project Settings → API → Exposed schemas, adicionar `healthia` à lista). Sem isso, o PostgREST não atende `.schema("healthia")` e todas as chamadas do app aos repositórios falham. O schema e as tabelas já existem — só falta essa exposição.
- [ ] **Supabase: criar a conta do Pedro** no projeto `rachaconta` (compartilhado). Hoje o projeto só tem ~95 usuários anônimos (de outros apps) — nenhuma conta com e-mail real. Criar via Dashboard → Authentication → Add user (e-mail + senha), ou por convite. A app não tem tela de cadastro de propósito.
- [ ] **Supabase: restringir RLS ao UUID do Pedro.** Depois que a conta existir, trocar o corpo de `healthia.is_authorized()` (nova migration) para comparar `auth.uid()` com o UUID fixo do Pedro, em vez de só checar "autenticado e não anônimo". Hoje a policy já bloqueia os ~95 usuários anônimos de outros apps do projeto, mas ainda aceitaria qualquer outra conta real que viesse a existir nesse projeto compartilhado.

## Decisão registrada (ver notas/ADR)

- Schema Supabase dedicado `healthia` dentro do projeto `rachaconta` (não um projeto Supabase novo — org já estava no limite de 2 projetos free). Detalhe em `notas/ADR/ADR-002-schema-compartilhado-supabase.md`.

## Depois (Fase 1)

- [ ] Fase 1 — ingestão manual + pipeline raw→events + PWA instalável

## Decisões pendentes

- [ ] Nome/domínio do app na Vercel (`healthia.vercel.app` — a confirmar depois que o deploy estiver liberado)
- [ ] Modelo Gemini do free tier a usar no chat (validar na Fase 6)
- [ ] Estratégia de backup: GitHub Action semanal com pg_dump (definir repo privado/artefato na Fase 0 ou 1)
