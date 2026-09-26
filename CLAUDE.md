# Regras do repositório (Enzo Games)

## Baralho Enzo (cartas) NUNCA vai para o `main`
**Regra do Henrique, extremamente importante:** o `main` (o site no ar) não pode conter o
sistema de cartas (Baralho Enzo) até ele dizer que está pronto.

- O Baralho vive no branch **`TCG`** do GitHub (no computador, o branch local `baralho`, aberto
  na pasta `comic-reader`, acompanha o `origin/TCG`). Trabalho de cartas, inclusive na nuvem,
  é feito e enviado no `TCG`. **Nunca faça merge do `TCG`/`baralho` no `main`.**
- Push do `main` só quando o Henrique pedir.
- Antes de qualquer push do `main`, confira que nada do Baralho vai junto:
  `git diff --stat origin/main main` e `git grep -il baralho main` (tem que dar só este arquivo).
  Arquivos do Baralho: `js/baralho-dados.js`, `js/baralho.js`, `api/baralho.js`,
  `test/baralho.test.js`, `docs/PLANO-BARALHO.md`, `docs/CARTAS-IDEIAS.md`,
  a Batalha dos Torados (`batalha.html`, `js/batalha.js`, `css/batalha.css`, `js/tcg-*.js`,
  `test/tcg-regras.test.js`, `tools/tcg-simular.mjs`, `tools/batalha-artifact.mjs`, `docs/PLANO-TCG.md`, `docs/BATALHA-ASSETS.md`, `docs/INSTRUCOES-ASSETS-CLAUDE.md`, `docs/PLANO-BATALHA-COMPLETA.md`, `assets/Batalha/`),
  `assets/Cartas/` (e as variantes em `assets/web/`, `data/images.json`, `js/images.generated.js`), e trechos em `api/schema.js`, `api/handler.js`,
  `api/games.js`, `api/admin.js`, `api/leitores.js`, `js/auth-widget.js`, `js/game-dialog.js`,
  `js/admin.js`, `admin.html`, `css/style.css`, páginas `*.html`, `README.md` e
  `docs/TESTES-PENDENTES.md`.
- Mudança que NÃO é do Baralho e precisa ir para o site: faça o commit no `main` (numa worktree
  separada, ex. `git worktree add ../push-main main`), faça o push de lá e depois traga para o
  `baralho` com `git cherry-pick` (ou `git merge main` no `baralho`).
- Quando o Henrique liberar o Baralho: aí sim `git merge baralho` no `main` e push.

## Outras regras
- Commit com `git commit -- <arquivos>`: a pasta `animacao/` é de outra conversa, não mexa.
- Depois de mudar `api/` ou `js/*-dados.js`, reinicie o servidor local.
