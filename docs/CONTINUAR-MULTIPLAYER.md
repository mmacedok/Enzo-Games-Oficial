# Multiplayer da Batalha dos Torados: como continuar

> **Fica só no branch `TCG`** (ver `CLAUDE.md`: o Baralho nunca vai para o `main`).
> Este arquivo é mantido em dia a cada etapa para que outra sessão do Claude, ou o Henrique,
> continue sem precisar da conversa. Cópia em `/mnt/project-files/tcg/CONTINUAR-MULTIPLAYER.md`.
> Plano completo: `docs/PLANO-MULTIPLAYER.md`. Regras do jogo: `docs/PLANO-TCG.md`.

**Última atualização:** 2026-09-26, depois do M2.
**Próximo passo exato:** o Henrique testar no computador (seção 6) e dizer o que ajustar; depois o M3
(seção 5b): reações prontas, aviso "sua vez!" no título da aba e revanche com o mesmo amigo.

## 1. Onde estamos
| Fase | Estado |
|---|---|
| Merge do `main` (site na Cloudflare) no `TCG` | feito (commits 6b936d6 e a1da90e) |
| **M0.** Motor pronto para online | **feito** (39b8c40), 49 testes passando |
| **M1.** Servidor: salas, jogadas, "teve jogada?", tempo de turno | **feito**, 7 testes em `test/tcg-online.test.js` |
| **M2.** Tela online (criar sala, entrar pelo link, mesa online) | **feito**, testado com duas janelas (Playwright) |
| **M3.** Reações prontas e avisos ("sua vez!") | falta |
| M4 a M6 (desafio pela Ficha, ranking, fila) | depois; só se o Henrique pedir |

## 2. Decisões já tomadas
- **Hospedagem:** desde 2026-09-26 o site está na **Cloudflare Pages** grátis
  (https://enzo-games-oficial.pages.dev, produção = `main`, previews desligados) com o **Neon grátis
  do Henrique**. Detalhes em `docs/PLANO-CLOUDFLARE.md`. O Netlify foi abandonado.
- **Transporte:** servidor como juiz dentro da API que já existe (`api/handler.js`, que roda no
  `dist/_worker.js` da Cloudflare e no `server.js` local) e **polling a cada 2,5 s só na vez do outro**.
  Motivo: roda no Pages sem serviço novo e cabe folgado nas 100 mil chamadas/dia (~300 por partida).
  Durable Objects (tempo real) ficam como fase opcional depois: o Pages não hospeda a classe do DO,
  seria preciso publicar um Worker separado. Quem for fazer isso: deixe a tela chamar o servidor por
  uma camada só (`conexao.buscar()`), para trocar o polling por WebSocket sem mexer no resto.
- **As 5 perguntas do plano** (o Henrique mandou implementar sem responder; ficaram as recomendações):
  sala com código primeiro; login Google obrigatório para jogar online; turno de 60 s e 3 estouros
  seguidos = derrota; só reações prontas, sem chat; limite de 50 partidas por dia no site e 10 por jogador.
- **Teste:** o `TCG` não vai para o ar (produção é o `main` e os previews estão desligados para o
  `TCG` não ganhar link público). Então o online se testa **no computador**: `npm start` e duas
  janelas (uma normal e uma anônima, cada uma com um login). Nos testes automáticos, PGlite.
- **CPU:** a Cloudflare grátis dá 10 ms de CPU por chamada (esperar o banco não conta). Medir no M1
  quanto custa `aplicar` + `JSON.parse/stringify` do estado.

## 3. O que o M0 entregou (`js/tcg-regras.js`)
- `REGRAS_VERSAO` (hoje 1): suba quando mudar uma regra; o servidor recusa navegador com outra versão.
- `visaoDe(estado, j)` agora também apaga `semente` (antes só `rng`).
- `motivoInvalida` e `jogadasValidas` funcionam com a **visão** (onde deck e mão do outro são números),
  via `qtd()`. Teste: "online: jogadasValidas e motivoInvalida dão o mesmo resultado com a visão".
- `eventosPara(eventos, j)`: tira eventos `privado` do outro (Câmera) e reduz a `compra` do outro a
  `{tipo:'compra', jogador, motivo}` (sem `uid` nem `id`: o `uid` `J-N` entrega a carta, porque N é a
  posição no deck pronto, que é conhecido).
- **Cuidado que continua valendo:** nunca mande o `estado` completo ao navegador, só `visaoDe`.

## 4. M1: servidor (feito)
- **Tabelas** no fim de `api/schema.js`: `tcg_salas`, `tcg_partidas` (estado completo em TEXT/JSON,
  `versao`, `prazo`, `estouros_a/b`, `status`), `tcg_jogadas` (n = versão depois da jogada, eventos
  completos, `automatica`) e `tcg_resultados`.
- **`api/tcg.js`** (ligado em `ROTAS` do `api/handler.js`). Rotas, todas com login:
  | Rota | Resposta |
  |---|---|
  | `POST /api/tcg/salas {deck}` | `{codigo, expira, deck}` (código `TORA-XXX`; uma sala aberta por jogador) |
  | `GET /api/tcg/salas/:codigo` | `{codigo, deck, criador, minha, expira, partida}` (partida ≠ null = começou) |
  | `POST /api/tcg/salas/:codigo/entrar {deck}` | cria a partida; responde como o GET da partida |
  | `POST /api/tcg/salas/:codigo/cancelar` | `{ok}` |
  | `GET /api/tcg/atual` | `{partida, sala, regras}` (para reconectar) |
  | `GET /api/tcg/partidas/:id?desde=n` | sempre `{id, versao, prazo, agora, eu, estouros, status, regras}`; se `versao ≠ desde`, também `{decks, visao, eventos}` (eventos só das jogadas depois de `desde`; `desde=-1` = só a visão) |
  | `POST /api/tcg/partidas/:id/jogada {jogada, versao, regras}` | igual ao GET com `desde` = versão de antes: os eventos da jogada e a visão nova. Erros: 400 jogada inválida (mensagem do motor), 409 versão velha (`{versao}`), 409 `{recarregar:true}` regras diferentes |
- Jogador A (índice 0) = quem criou a sala; B (1) = quem entrou. O servidor troca `jogada.jogador` pelo
  lado do login. Decks prontos agora em `js/tcg-cartas.js` (`DECKS_PRONTOS`); `js/batalha.js` usa de lá.
- **Relógio preguiçoso** (`conferirRelogio`): a cada chamada, se `agora > prazo`, quem devia agir
  (`quemDeve`: preparo, escolha pendente ou a vez) ganha um estouro e o servidor joga por ele
  (`passar` ou a 1ª escolha válida); no 3º seguido, `desistir`. Evento novo `{tipo:'tempo', jogador,
  estouros}` (a tela precisa mostrar). O prazo só recomeça quando muda quem precisa agir, então o
  turno inteiro tem 60 s. Jogar zera os estouros de quem jogou.
- **Freios feitos:** 50 partidas/dia no site, 10 por jogador (429), limpeza de salas e partidas velhas
  ao criar sala. **Falta:** limitar a 1 pergunta por segundo por jogador (fazer no M3 se precisar).
- **Medido:** partida de robôs = ~42 jogadas e ~130 chamadas (sem contar as perguntas de espera);
  motor + JSON no servidor ≈ 0,3 ms por jogada (máx. 1 ms), bem abaixo dos 10 ms da Cloudflare;
  estado ≈ 4,6 KB.

## 5. M2: tela (feito)
Tudo em `js/batalha.js` (seção "online (outro jogador)") e `css/batalha.css` (fim do arquivo):
- `EU`/`NPC` viraram variáveis: online, quem criou a sala é o 0 e quem entrou é o 1. `NPC` = "o outro lado".
- Online, `estado` guarda só a **visão** que o servidor mandou. `passo()` chama `passoOnline()`
  (POST da jogada; em 409 atualiza e manda de novo uma vez, se ainda valer: acontece quando os dois se
  preparam juntos) e `continuar()` chama `agendarBusca()`. `receber()` toca os eventos com a mesma
  fila de animações do jogo contra o NPC.
- Polling: `agendarBusca()` pergunta a cada 2,5 s quando não é a minha vez; na minha vez, só quando o
  meu prazo acaba. Para com a aba escondida (`visibilitychange`) e volta ao reaparecer.
- Menu: o card "Outro jogador" chama `verificarOnline()` (GET `/api/tcg/atual`): "Com um amigo",
  "Entre com o Google", "Voltar para a partida" ou, sem servidor (artifact), "Só no site" desligado.
  `telaOnline()`: criar sala (código grande, Copiar link, espera com polling da sala, Cancelar), entrar
  com código (aceita só as 3 letras) e voltar para a partida. `batalha.html?sala=TORA-XXX` abre direto
  nessa tela com o código preenchido.
- Mesa: relógio `⏱ 42s` embaixo da dica (pisca vermelho nos últimos 10 s do meu tempo), textos com o
  primeiro nome do outro no lugar de "NPC", evento `tempo` no histórico e num banner, "Sair" avisa que a
  partida continua, fim de jogo com "Nova partida online".
- Para testes: `window.EnzoBatalha.jogar(jogada)`, `.eu`, `.online`, `.ocupado`.

## 5b. M3: o que falta (em ordem)
1. Reações prontas (😂 👍 😱 "Boa jogada!" "Ops"): rota `POST /api/tcg/partidas/:id/reacao`, guardar
   na partida (ex. coluna `reacoes` com as últimas 5 e a hora) e mandar na resposta do GET.
2. Aviso de "sua vez!": título da aba piscando e som curto quando a vez chegar com a aba escondida.
3. Revanche: no fim, "Jogar de novo" cria uma sala e avisa o outro (ele vê o botão "Aceitar").
4. Limitar a 1 pergunta por segundo por jogador no servidor (freio que faltou no M1).
5. Depois (M4 a M6 do plano): desafio pela Ficha, ranking online, fila "procurar partida",
   Durable Objects no lugar do polling (só se ficar lento ou caro).

## 6. Como testar hoje
- `node --test test/tcg-regras.test.js` (motor, 49 testes) e `node --test test/tcg-online.test.js`
  (servidor, 7 testes, ~20 s). `npm test` tem ~12 falhas antigas por
  falta dos dados gerados dos gibis, sem relação com a batalha.
- Servidor local: `npm install`, depois `npm start` (ou `PORT=3123 node server.js`), abrir
  `http://localhost:3123/batalha.html`. Reinicie o servidor depois de mexer em `api/` ou `js/*-dados.js`.
- Build da Cloudflare (para conferir que nada quebrou): `npm run build:cloudflare`.
- **Online no computador, com dois jogadores falsos** (sem Google):
  `ENZO_LOGIN_FALSO=1 ENZO_DB=memoria GOOGLE_CLIENT_ID=x.apps.googleusercontent.com SESSION_SECRET=<40 letras> PORT=3123 node server.js`.
  Em cada janela (uma normal e uma anônima), entre pelo console do navegador:
  `fetch('/api/auth/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:'teste:ana:Ana da Silva Teste'})})`
  (a credencial precisa ter 20 letras ou mais) e recarregue. Uma cria a sala, a outra entra com o código.
- Teste automático das duas janelas: `/mnt/project-files/tcg/online-e2e.mjs` (Playwright com dois
  contextos; os robôs jogam chamando `EnzoBatalha.jogar`). Rode com o servidor acima ligado.

## 7. Arquivos
`js/tcg-regras.js` (motor), `js/tcg-cartas.js` (números das cartas), `js/tcg-robo.js` (NPC),
`js/batalha.js` + `css/batalha.css` + `batalha.html` (tela), `api/handler.js` + `api/schema.js` +
`api/tcg.js` (servidor), `test/tcg-regras.test.js`, `test/tcg-online.test.js`,
`docs/PLANO-MULTIPLAYER.md`, este arquivo. Todos são do Baralho: só no `TCG`.

## 8. Enviar
Commit só dos arquivos mexidos (`git commit -- <arquivos>`, nunca a pasta `animacao/`) e
`git push origin HEAD:TCG`. Nunca push nem merge no `main`. Depois de mexer na tela, republicar o link
de jogar (artifact, ver `docs/INSTRUCOES-ASSETS-CLAUDE.md` seção 7).
