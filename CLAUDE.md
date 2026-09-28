# Regras do repositório (Enzo Games)

## Baralho Enzo e Batalha dos Torados (cartas)
**Liberados no `main` em 2026-09-28, a pedido do Henrique** (merge do `TCG`).
- O **Baralho Enzo** aparece normalmente no site (aba Baralho, convite de login, cartas nas fichas).
- A **Batalha dos Torados** fica **escondida até quarta-feira, 2026-09-30** (liberação ao público):
  fora dos menus e do convite, `batalha.html` com `noindex`, e a **única entrada é a porta secreta**:
  clicar no quadradinho **nº 99 dos Enzos secretos** (Minha ficha / fichas dos leitores), em
  `js/auth-widget.js`. O Henrique conta o segredo a quem ele quiser. **Não crie link para
  `batalha.html` nem cite a Batalha em textos do site até ele liberar.**
- Para liberar (só quando o Henrique pedir): voltar o item do convite e o atalho `.baralho-batalha`
  (comentados em `js/baralho.js`), tirar o `noindex` de `batalha.html` e perguntar se a porta do 99 fica.
- O branch `TCG` pode continuar como branch de trabalho das cartas; ele vai para o `main` com
  `git merge` quando o Henrique pedir. Push do `main` só quando o Henrique pedir.

## Pendências (docs/PENDENCIAS.md)
- No fim de cada tarefa, atualize `docs/PENDENCIAS.md`: tire o que ficou pronto (para "Feito recentemente",
  com a data), acrescente o que ficou pendente e siga o que o Henrique marcou ou comentou lá.
  Mantenha curto: o que já está em `docs/TESTES-PENDENTES.md` só é citado.

## Outras regras
- Commit com `git commit -- <arquivos>`: a pasta `animacao/` é de outra conversa, não mexa.
- Depois de mudar `api/` ou `js/*-dados.js`, reinicie o servidor local.
