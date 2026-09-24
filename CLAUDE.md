# Regras do repositório (Enzo Games)

## Baralho Enzo (cartas) NUNCA vai para o GitHub
**Regra do Henrique, extremamente importante:** nenhum push pode conter o sistema de cartas
(Baralho Enzo) até ele dizer que está pronto.

- O Baralho vive só no computador, no branch local **`baralho`** (é o branch aberto na pasta
  `comic-reader`). **Nunca faça push do branch `baralho`** nem faça merge dele no `main`.
- Push só do `main`, e só quando o Henrique pedir.
- Antes de qualquer push, confira que nada do Baralho vai junto:
  `git diff --stat origin/main main` e `git grep -il baralho main` (tem que dar só este arquivo).
  Arquivos do Baralho: `js/baralho-dados.js`, `js/baralho.js`, `api/baralho.js`,
  `test/baralho.test.js`, `docs/PLANO-BARALHO.md`, e trechos em `api/schema.js`, `api/handler.js`,
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
