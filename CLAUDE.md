# Regras do repositório (Enzo Games)

## Baralho Enzo e Batalha dos Torados (cartas)
**Liberados no `main` a pedido do Henrique** (Baralho em 2026-09-28). A Batalha dos Torados está em
lançamento no update que o Henrique está preparando: pode aparecer normalmente no site (por exemplo,
o placar na ficha de cada leitor). A entrada pela porta secreta (Enzo secreto nº 99) e o `noindex`
de `batalha.html` continuam como estão até ele decidir o contrário.
- O branch `TCG` pode continuar como branch de trabalho das cartas; ele vai para o `main` com
  `git merge` quando o Henrique pedir. Push do `main` só quando o Henrique pedir.

## Pendências (docs/PENDENCIAS.md)
- No fim de cada tarefa, atualize `docs/PENDENCIAS.md`: tire o que ficou pronto (para "Feito recentemente",
  com a data), acrescente o que ficou pendente e siga o que o Henrique marcou ou comentou lá.
  Mantenha curto: o que já está em `docs/TESTES-PENDENTES.md` só é citado.

## Outras regras
- Commit com `git commit -- <arquivos>`: a pasta `animacao/` é de outra conversa, não mexa.
- Depois de mudar `api/` ou `js/*-dados.js`, reinicie o servidor local.
