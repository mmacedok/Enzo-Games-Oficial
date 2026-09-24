# Testes pendentes

Lista do que ainda precisa ser testado. Pelo combinado, os testes grandes (robôs,
navegador, várias telas) vão para os agentes do Gemini via `/teamwork-preview`;
depois eu confiro o resultado. Marque `[x]` quando passar e anote o que quebrou.

## Painel admin (`admin.html`) — criado em 2026-09-24

Já testado: `test/admin.test.js` (8 testes da API, todos passando quando foram criados).
Nada da página foi aberto no navegador ainda.

### Preparação
- [ ] Reiniciar o servidor local (`npm run serve`): mudou `api/` e o `.env` ganhou `ADMIN_EMAILS`.
- [ ] Conferir se o e-mail em `ADMIN_EMAILS` (`.env`) é o mesmo da conta Google usada no login.
- [ ] Rodar `npm test` completo (os 93 antigos + os 8 novos de admin).

### Entrada e segurança
- [ ] Sem login: `admin.html` mostra "SEM SESSÃO" e o link para o site.
- [ ] Logado com conta que não é admin: "ACESSO NEGADO", prompt desligado, sem atalhos.
- [ ] Conta comum chamando `/api/admin/*` direto: responde 404.
- [ ] Admin: boot → "acesso concedido" → `status` roda sozinho e o painel lateral enche.
- [ ] Ficha do Leitor (admin): o botão `>_ terminal` aparece no rodapé e abre `admin.html`.
- [ ] Ficha do Leitor (não admin): o botão não aparece. Some ao sair da conta.

### Comandos
- [ ] `help`, `status`, `users`, `users <busca>`, `open <n>`, `open <nome>`, `close`, `whoami`, `clear`, `exit`, `site`.
- [ ] Apelidos: `ls`, `cd`, `?`, `cls`, `sair`, `ajuda`.
- [ ] `grant` / `revoke` com id (`macarronada`) e secreto (`#7`, `7`); `#100` e id inventado dão erro.
- [ ] Clicar nas caixas `[x]/[ ]` e nos números da grade dos 99 secretos: liga/desliga e atualiza na hora.
- [ ] Depois de `grant`, o leitor vê a conquista na Ficha dele (recarregar o site).
- [ ] `ban` pede `[s/N]`; "s" bane, qualquer outra coisa cancela. Banido some do ranking e da lista de leitores e cai a sessão.
- [ ] `unban` devolve. Tentar banir a própria conta ou outro admin: erro.
- [ ] `kick` pede confirmação e derruba as sessões (o leitor precisa entrar de novo).
- [ ] `fala <texto>` troca a fala pública; `fala -` volta à do Enzo; link na fala dá erro.
- [ ] `scores`, `scores flappy`, `scores degustacao`, `scores xadrez` (erro).
- [ ] `hide <n>` tira do ranking, `show <n>` devolve, `rm <n>` pede confirmação e apaga.
- [ ] `log` mostra tudo o que foi feito acima, com quem fez e em quem.
- [ ] Teclado: ↑/↓ histórico, Tab completa comando / id de conquista / jogo, Ctrl+L limpa.
- [ ] Cliques rápidos seguidos na grade não se atropelam (fila).

### Visual
- [ ] Desktop: fundo preto, verde claro, scanlines, brilho, relógio andando, logo ASCII alinhado.
- [ ] Celular (375px): painel em cima, sem rolagem lateral, prompt usável, tabelas não estouram a tela.
- [ ] Nome/e-mail muito longo: corta com "…" e não quebra a tabela.
- [ ] Foto do Google aparece esverdeada (filtro) na conta aberta.
- [ ] `prefers-reduced-motion`: sem tremor/piscar e boot instantâneo.

### Produção (Netlify)
- [ ] Criar a variável `ADMIN_EMAILS` no Netlify (Functions/Runtime) e fazer deploy novo.
- [ ] `https://enzo-games.netlify.app/admin.html` entra como admin; conta comum vê "ACESSO NEGADO".
- [ ] A tabela `admin_log` foi criada sozinha no primeiro acesso.

## Conquistas Superkid e Torado — criadas em 2026-09-24

Já testado: `test/conquistas.test.js` e `test/api.test.js` (passando).

- [ ] Ler o Superkid até a última página → toast "Herói de Operator Village" e figurinha no álbum.
- [ ] Ler o Torado até a última página → toast "No Olho do Torado".
- [ ] Álbum da Ficha mostra 6 conquistas; o progresso "lidos/total" aparece nas duas novas.
- [ ] Leitor que já tinha lido tudo antes ganha as duas ao abrir o site logado.
- [ ] Terminal: `achievements` lista as duas; `grant superkid-completo` / `revoke torado-completo` funcionam.
- [ ] Produção: só depois do deploy (o servidor precisa conhecer os ids novos).
