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

## Cartas dos Leitores (comentários) — criadas em 2026-09-24

Já testado: `test/comentarios.test.js` (7 testes da API, passando). A tela não foi aberta ainda.

### Lugar na tela
- [ ] Computador 1920×1080: cartas à direita da última página, grudadas enquanto a página rola; "Ler próximo" embaixo da página.
- [ ] Computador 1366×768: ainda ao lado (as páginas andam um pouco para a esquerda), nada cortado nas bordas.
- [ ] 1024 e 800 de largura: cartas descem para baixo do "Ler próximo".
- [ ] Zoom do leitor acima de 100%: cartas embaixo; voltar ao 100% põe de novo ao lado.
- [ ] Celular 375×812: última página → "Ler próximo" → cartas; sem rolagem para os lados.
- [ ] Último capítulo sem próximo (ex.: capítulo 7): as cartas aparecem mesmo sem o botão.
- [ ] Gibis de 1 página só, Degustador (4 capítulos: cada capítulo tem a sua conversa), Superkid e Torado.
- [ ] "Continuar de onde parou" ainda cai na página certa (inclusive a última).
- [ ] O capítulo continua sendo marcado como lido ao chegar na última página.

### Usar
- [ ] Sem login: convite "Entrar para comentar" abre o balão do Google no topo.
- [ ] Logado: escrever, contador de letras, "Mandar carta!", a carta aparece no topo e o número no estouro sobe.
- [ ] Erros aparecem em vermelho: link, texto vazio, 2 cartas em menos de 30 s.
- [ ] Autor: "apagar" pede "apagar mesmo?" e some.
- [ ] Clicar no nome/foto abre a ficha do leitor (a sua abre "Minha ficha").
- [ ] "Cartas mais antigas" com mais de 30 cartas.
- [ ] Trocar de capítulo pelo seletor ou pelo "Ler próximo" carrega a conversa certa.
- [ ] Texto com quebras de linha, emojis e 500 letras não estoura o balão.

### Admin (três botões em cada carta)
- [ ] Conta comum não vê nenhum dos três botões.
- [ ] ✂ Apagar: primeiro clique "Apagar mesmo?", segundo apaga; sem o segundo clique volta ao normal em 4 s.
- [ ] ▇ Censurar: palavras viram botões, marcar/desmarcar, "Salvar tarjas" → barras pretas tortas; "Cancelar" não muda nada.
- [ ] A palavra censurada não aparece para conta comum/visitante nem no "inspecionar elemento" nem na aba Rede (resposta de /api/comments).
- [ ] Censurar de novo: as palavras já tarjadas vêm marcadas; desmarcar tudo e salvar tira a tarja.
- [ ] ⛔ Banir: não aparece nas cartas do próprio admin; confirma e some com todas as cartas do autor; `unban` no terminal traz de volta.
- [ ] O terminal (`log`) mostra comment-rm, comment-censor e ban.
