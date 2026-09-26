# Multiplayer da Batalha dos Torados: como continuar

> **Fica só no branch `TCG`** (ver `CLAUDE.md`: o Baralho nunca vai para o `main`).
> Este arquivo é mantido em dia a cada etapa para que outra sessão do Claude, ou o Henrique,
> continue sem precisar da conversa. Cópia em `/mnt/project-files/tcg/CONTINUAR-MULTIPLAYER.md`.
> Plano completo: `docs/PLANO-MULTIPLAYER.md`. Regras do jogo: `docs/PLANO-TCG.md`.

**Última atualização:** 2026-09-26, depois do M0.
**Próximo passo exato:** começar o M1 (seção 4) criando `api/tcg.js` e as tabelas em `api/schema.js`.

## 1. Onde estamos
| Fase | Estado |
|---|---|
| Merge do `main` (site na Cloudflare) no `TCG` | feito (commits 6b936d6 e a1da90e) |
| **M0.** Motor pronto para online | **feito** (39b8c40), 49 testes passando |
| **M1.** Servidor: salas, jogadas, "teve jogada?", tempo de turno | falta |
| **M2.** Tela online (criar sala, entrar pelo link, mesa online) | falta |
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

## 4. M1: servidor (o que fazer, em ordem)
1. **Tabelas** no fim de `api/schema.js` (só `CREATE ... IF NOT EXISTS`, um comando por item):
   - `tcg_salas (codigo TEXT PK, criador TEXT REFERENCES users(id), deck TEXT, criado_em BIGINT, expira_em BIGINT, partida_id TEXT)`
   - `tcg_partidas (id TEXT PK, jogador_a TEXT, jogador_b TEXT, deck_a TEXT, deck_b TEXT, estado JSONB,
     versao INT, regras INT, prazo BIGINT, estouros_a INT, estouros_b INT, status TEXT, vencedor INT,
     motivo TEXT, criado_em BIGINT, atualizado_em BIGINT)` + índice por jogador e status.
   - `tcg_jogadas (partida_id TEXT, n INT, jogador INT, jogada TEXT, eventos TEXT, criado_em BIGINT, PK(partida_id, n))`
   - `tcg_resultados (partida_id TEXT PK, vencedor TEXT, perdedor TEXT, decks TEXT, turnos INT, motivo TEXT, fim_em BIGINT)`
2. **`api/tcg.js`** no mesmo formato de `api/baralho.js` (`const rotas = [{metodo, caminho, login:true, executar(ctx)}]`)
   e somar `...tcg.rotas` em `ROTAS` do `api/handler.js`. Rotas:
   - `POST /api/tcg/salas {deck}`: cria sala (código tipo `TORA-7K2`, expira em 15 min).
   - `POST /api/tcg/salas/:codigo/entrar {deck}`: cria a partida com `criarPartida({semente: aleatória do servidor, decks, nomes})`.
   - `GET /api/tcg/partidas/atual`: partida em andamento do jogador (reconectar).
   - `GET /api/tcg/partidas/:id?desde=<versao>`: se nada mudou, `{versao, prazo}`; se mudou,
     `{versao, prazo, visao: visaoDe(...), eventos: eventosPara(eventos das jogadas > desde)}`.
   - `POST /api/tcg/partidas/:id/jogada {jogada, versao, regras}`: força `jogada.jogador` = lado do usuário,
     `aplicar`, salva com `UPDATE ... WHERE id=$1 AND versao=$2` (se não salvou: 409 "atualize").
   - `POST /api/tcg/partidas/:id/reacao {reacao}` (M3).
   - Os decks prontos ficam em `js/batalha.js` (constante dos 3 decks): mover a lista para
     `js/tcg-cartas.js` (ex. `DECKS_PRONTOS`) para o servidor e a tela usarem a mesma.
3. **Relógio preguiçoso:** a cada GET/POST, se `agora > prazo`, o servidor aplica `passar` (ou, se
   houver `pendentes`/`preparacao`, uma escolha automática com `jogadasValidas(...)[0]`), soma o
   estouro daquele lado e, no 3º seguido, `desistir` por ele. Jogar zera os estouros do lado.
4. **Freios:** 50 partidas/dia no site, 10 por jogador; 1 GET por segundo por jogador; limpeza de
   partidas terminadas há 7 dias "de carona" na criação de sala.
5. **Teste** `test/tcg-online.test.js` no molde de `test/baralho.test.js` (API com PGlite e login falso):
   dois robôs (`js/tcg-robo.js`) jogam uma partida inteira pela API usando só a visão; conferir que
   ninguém recebe a mão do outro, jogada fora da vez dá erro, versão velha dá 409, estouro de tempo
   passa a vez e 3 estouros dão derrota. Medir chamadas e tempo de CPU por jogada.

## 5. M2: tela (resumo)
`js/batalha.js` hoje chama o motor direto. Criar dois modos de "mesa": **local** (NPC, como hoje) e
**online** (manda a jogada para a API, recebe `visao` + `eventos` e reaproveita a mesma fila de
animações). Na visão a mão do outro é um número: desenhar os versos por contagem. Menu "Outro
jogador" (hoje desativado) → criar sala / colar código; `batalha.html?sala=CODIGO` entra direto.
Relógio do turno na barra. Parar o polling com a aba escondida. O artifact continua só contra o NPC.

## 6. Como testar hoje
- `node --test test/tcg-regras.test.js` (motor, 49 testes). `npm test` tem ~12 falhas antigas por
  falta dos dados gerados dos gibis, sem relação com a batalha.
- Servidor local: `npm install`, depois `npm start` (ou `PORT=3123 node server.js`), abrir
  `http://localhost:3123/batalha.html`. Reinicie o servidor depois de mexer em `api/` ou `js/*-dados.js`.
- Build da Cloudflare (para conferir que nada quebrou): `npm run build:cloudflare`.

## 7. Arquivos
`js/tcg-regras.js` (motor), `js/tcg-cartas.js` (números das cartas), `js/tcg-robo.js` (NPC),
`js/batalha.js` + `css/batalha.css` + `batalha.html` (tela), `api/handler.js` + `api/schema.js` +
`api/tcg.js` (servidor, a criar), `test/tcg-regras.test.js`, `test/tcg-online.test.js` (a criar),
`docs/PLANO-MULTIPLAYER.md`, este arquivo. Todos são do Baralho: só no `TCG`.

## 8. Enviar
Commit só dos arquivos mexidos (`git commit -- <arquivos>`, nunca a pasta `animacao/`) e
`git push origin HEAD:TCG`. Nunca push nem merge no `main`. Depois de mexer na tela, republicar o link
de jogar (artifact, ver `docs/INSTRUCOES-ASSETS-CLAUDE.md` seção 7).
