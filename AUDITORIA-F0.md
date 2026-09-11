# Auditoria F0 — HealthIA

Prompts prontos para colar no Claude Code (ou Copilot) rodando na raiz deste repo.
Ordem obrigatória: 1 → 2 → 3. O 4 é independente.

Regra geral para todos: **o agente lê e propõe. Só o prompt 3 escreve código.**

---

## Prompt 1 — Inventário (somente leitura)

```
Você vai auditar este repositório. NÃO altere nenhum arquivo nesta etapa.

Leia CLAUDE.md, docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/ENGINES.md,
docs/ROADMAP.md e os arquivos mais recentes de notas/. Depois percorra o código.

Produza o relatório em notas/auditoria/INVENTARIO.md com estas seções:

1. MAPA
   - Cada workspace (web, sync-app, dashboard): o que é, roda ou não, deploy.
   - Todas as rotas do Next.js App Router: caminho do arquivo, o que a tela faz,
     e de onde ela tira os dados.
   - Todas as tabelas do Supabase (migrations em web/supabase): colunas, e se
     existe código que ESCREVE nela e código que LÊ dela.

2. TABELAS VAZIAS NA PRÁTICA
   Para cada tabela: existe algum caminho real de escrita hoje (formulário, import,
   sync, cron)? Marque SEM-ESCRITA quando a tabela só tem leitura.
   Esta é a seção mais importante do relatório.

3. TELAS QUE MENTEM
   Liste todo componente que renderiza número, meta, card ou texto de insight cuja
   fonte é uma tabela SEM-ESCRITA, ou um valor default/mock/hardcoded.
   Para cada um: arquivo, linha, e o que ele mostra quando não há dado.
   Procure especificamente por: insights, cards de peso na home, metas de percentual
   de gordura, e os botões de +/- de água (qual unidade cada clique soma?).

4. O QUE ESTÁ VIVO
   O que funciona de ponta a ponta hoje, com o caminho do dado do input até a tela.
   Diga explicitamente em que estado está o plano alimentar e o importador de exame
   por foto.

5. ENGINES
   web/src/engines: o que está implementado, o que tem teste (vitest), o que é
   esqueleto. Aponte onde a IA calcula indicador em vez de só explicar — isso viola
   o princípio 2 do CLAUDE.md.

6. DESIGN
   Existe design system, tokens, tema? Ou é Tailwind solto por componente?
   Conte quantos componentes têm cor/spacing hardcoded.

7. DÍVIDA
   Código morto, TODO/FIXME, dependência não usada, teste quebrado, migration
   aplicada fora de ordem.

Seja concreto: caminho de arquivo e número de linha em cada afirmação.
Não proponha solução nenhuma neste relatório.
```

---

## Prompt 2 — Plano de corte (somente leitura)

Rode só depois de ler o INVENTARIO.md e concordar com ele.

```
Leia notas/auditoria/INVENTARIO.md.

Regra que passa a valer neste projeto: nenhuma tela renderiza componente sem dado
real. Sem placeholder, sem "sem dado suficiente", sem meta que o usuário não criou.

Escreva notas/auditoria/PLANO-DE-CORTE.md com uma tabela:
arquivo | o que faz | MATAR / REESCREVER / MANTER | justificativa em uma linha

Critérios:
- MATAR: alimenta-se de tabela SEM-ESCRITA, ou mostra valor inventado.
- REESCREVER: a função é boa mas a implementação mente ou confunde
  (ex.: botão de água sem unidade visível).
- MANTER: tem caminho de dado real de ponta a ponta.

No fim, some: quantos arquivos, quantas linhas e quantas rotas o corte remove.
Não escreva código ainda.
```

---

## Prompt 3 — Executar o corte (escreve)

```
Leia notas/auditoria/PLANO-DE-CORTE.md e execute-o.

- Crie a branch fase0/corte.
- DELETE o código marcado MATAR. Não comente, não deixe flag, não deixe
  arquivo órfão — o histórico está no git.
- Remova rota, item de menu, import e teste que ficarem órfãos.
- Não implemente nada novo. REESCREVER fica para depois; nesta etapa apenas
  remova o que mente.
- Rode lint, typecheck e vitest. O build tem que passar no fim.
- Um commit por área, conventional commits.
- Atualize CLAUDE.md com a regra do dado real e uma seção "Removido na F0"
  explicando o porquê.
- Atualize notas/ com o registro da sessão.

No fim, mostre o diffstat e me diga o que ficou de pé.
```

---

## Prompt 4 — Crash do sync-app (independente)

```
O sync-app (Expo + react-native-health-connect) quebra no build de preview.
Leia notas/ e procure o registro do diagnóstico desse crash.

Investigue e me responda, sem alterar código ainda:
1. O erro exato e em que etapa do build ele acontece.
2. Se é config (app.json, eas.json, permissões do Health Connect no
   AndroidManifest), versão de dependência, ou código.
3. As permissões do Health Connect declaradas versus as que o código pede.
4. Se o sync-app já chegou a ler dado real do Health Connect alguma vez — procure
   evidência no git log e nas notas.
5. O caminho mais curto até um build que instala e lê um único tipo de dado
   (passos), ignorando todo o resto.

Depois me apresente o plano antes de mexer em qualquer arquivo.
```

---

## Coleta rápida, se quiser olhar antes (PowerShell, na raiz do repo)

```powershell
git log --oneline -30
git ls-files | Measure-Object -Line
Get-ChildItem -Recurse -Include *.ts,*.tsx -Exclude node_modules | Measure-Object -Line
Get-ChildItem web/supabase -Recurse -Filter *.sql | Select-Object Name
Get-ChildItem web/src/app -Recurse -Filter page.tsx | Select-Object FullName
Select-String -Path web/src/**/*.tsx -Pattern "TODO|FIXME|mock|placeholder|sem dado"
```

Equivalente em Git Bash / WSL:

```bash
git log --oneline -30
git ls-files | wc -l
find web/src sync-app/src -name '*.ts*' -not -path '*/node_modules/*' | xargs wc -l | tail -1
ls web/supabase/migrations
find web/src/app -name 'page.tsx'
grep -rn "TODO\|FIXME\|mock\|placeholder\|sem dado" web/src --include='*.tsx' | head -40
```
