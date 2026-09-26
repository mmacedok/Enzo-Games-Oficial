# Plano da Batalha dos Torados (o jogo de cartas do Baralho Enzo)

> Plano de jogo e de implementação. **Fica só no branch `TCG`** (ver `CLAUDE.md`).
> Decidido com o Henrique em 2026-09-26. Regras e números valem o que está em `js/tcg-regras.js` e
> `js/tcg-cartas.js`; se este texto e o código discordarem, o código manda e este texto é corrigido.

## 1. Decisões do Henrique (2026-09-26)
- **Nome:** Batalha dos Torados.
- **Regras:** Pokémon TCG Pocket (o Pokémon de celular), adaptadas: deck de 15, energia automática
  (a **Aura**), 3 pontos para vencer, cartas de campo como o Estádio do Pokémon.
- **Todas as cartas liberadas** para montar deck. Ligar o deck ao fichário de cada leitor pode voltar
  quando a coleção crescer (o motor já aceita: `validarDeck(ids, { colecao })`).
- **Os números das 24 cartas** (seção 3) foram aprovados.
- **Visual interativo** estilo Hearthstone (as cartas se movem e atacam) com efeitos chamativos estilo
  Card Wars (Hora de Aventura). Ver seção 5.
- **Adversário:** contra o computador (NPC) primeiro. **Contra outro jogador depois**, mas a base já é
  feita para isso (seção 4).

Por que o Pocket e não o Pokémon clássico: sem deck de 60 nem cartas de energia, partidas de 5 a 10
minutos, fácil para quem nunca jogou. As 3 categorias que já existem viram as 3 peças do jogo:
**personagem** = o "Pokémon" forte, **goon** = o básico e barato, **campo** = o Estádio.

## 2. Regras

### O deck
- **15 cartas**, no máximo **2 cópias** da mesma carta e **1 de cada lendário**.
- Precisa de **pelo menos 1 personagem ou goon**.

### A mesa
- **Ativo** (1 vaga): quem luta.
- **Banco** (3 vagas): quem espera.
- **Campo** (1 vaga, **compartilhada** pelos dois jogadores): o lugar onde a luta acontece.
- Deck, mão e pilha de descarte.

### Aura (a energia)
- Todo turno o jogador ganha **1 Aura** e prende em **um** personagem ou goon seu (ativo ou banco).
- Ataques custam Aura (1, 2 ou 3). A Aura fica presa na carta; se ela cair, a Aura vai junto.
- **Quem começa não ataca no 1º turno.**
- **Aura de Reforço:** quem joga em segundo ganha **+1 Aura no seu 1º turno**, que só pode ir para o **banco**.
  - *Por quê:* o simulador mostrou que sem compensação quem começa vence 63% (com a regra do Pocket
    original, só 34%). Com a Aura de Reforço fica **49%**.
- Versão 1 sem cores de Aura. Cores (tipos e fraquezas) ficam para depois (seção 6, fase 8).

### O turno
1. Compra 1 carta.
2. Em qualquer ordem:
   - põe personagens e goons no banco (até 3 no banco);
   - joga **1 campo**: troca o que está na mesa, que vai para o descarte do dono; não pode repetir o campo que já está lá;
   - prende a Aura do turno;
   - usa os **Poderes** das cartas (os que se ativam: 1 vez por turno cada carta);
   - **recua** o ativo para o banco (uma vez, pagando o custo de recuo em Aura).
3. **Ataca** com o ativo (opcional). Atacar acaba o turno; "Passar" também.

### Dano, nocaute e pontos
- Dano fica marcado na carta até ela cair ou ser curada. HP 0 = **nocaute**: a carta vai para o descarte.
- O dono escolhe outro do banco para o ativo (antes do jogo seguir).
- Nocautear **goon, personagem comum, raro ou épico = 1 ponto**; **lendário = 2 pontos**.
- **Vence** quem fizer **3 pontos** ou deixar o outro sem ninguém na mesa. Se os dois chegarem juntos,
  vence quem tiver mais pontos (igual = empate).
- Deck vazio: o jogador só não compra; ninguém perde por isso.
- **Limite de 30 turnos** (somando os dois): vence quem tiver mais pontos, senão é empate.
- **Desistir** encerra na hora a favor do outro.

### Começo
- Cada um compra **5 cartas**. Se não tiver personagem/goon na mão, embaralha e compra de novo (sem castigo).
- Os dois escolhem o ativo e o banco escondidos; aí revelam. A moeda decide quem começa.

### Estados (3, com nomes do universo)
- **Notificado** (veneno): leva 10 entre um turno e outro. Sai ao voltar para o banco.
- **Silenciado** (paralisia): não ataca nem recua no próximo turno do dono.
- **Iludido** (confusão): ao atacar, moeda; se der coroa, o ataque falha e ele leva 20. Sai ao voltar para o banco.
- Qualquer carta que volta para o banco (recuo ou puxada pela Encantadora) perde os estados.

## 3. As 24 cartas no jogo (aprovadas em 2026-09-26)

Legenda: **HP**, ataques como `Nome (custo em Aura): dano + efeito`, **Poder** (sem custo), **Recuo**.
Base: goon comum 40–70 HP, raro 70–100, épico 90–110, lendário 120–140; ~25 de dano por Aura.

### Lendários (valem 2 pontos)
| Carta | HP | Recuo | Poder / Ataques |
|---|---|---|---|
| Enzo Games | 140 | 2 | **Almôndega (1):** 30. **Macarronada a 300% (3):** 120. |
| Cabo Côco | 130 | 2 | **Poder, Conteúdo Banido:** com ele no ativo, o outro não joga campos. **Arquivo Confidencial (2):** 60 e cura 20 dele. |
| Degustador da Noite | 130 | 1 | **Vírgula-rangue (1):** 20 em qualquer carta do outro (inclusive banco). **Escudo de Parênteses (3):** 90 e leva −30 de dano no próximo turno. |
| O Inominável | 120 | 2 | **Poder, Besteira no Discord:** 1 vez por turno, deixa o ativo do outro Notificado. **Bala Dourada (3):** 60 em qualquer carta do outro. |
| Superkid | 130 | 2 | **Farmar Aura (1):** prende +1 Aura nele. **Aura de 67 Segundos (2):** 20 + 20 por Aura nele. |

### Épicos
| Carta | HP | Recuo | Poder / Ataques |
|---|---|---|---|
| Chorão | 110 | 3 | **Poder, Vou te Processar!:** quem ataca o Chorão leva 20 de volta. **Birra (2):** 50. |
| Sombra do Degustador | 90 | 0 | **Teemo no Top (1):** 20 e Notificado. **Fumaça Roxa (2):** 50. |

### Raros
| Carta | HP | Recuo | Poder / Ataques |
|---|---|---|---|
| Hatsune Neves | 80 | 1 | **Poder, Invoco uma Carta de Magic:** 1 vez por turno, compra 1 carta. **Porta do Quarto (2):** 30 e leva −20 no próximo turno. |
| ItaloLOL | 90 | 1 | **Au! Aura! (1):** 20. **0/14/2 (2):** 70, mas o ItaloLOL leva 30 (a culpa é do jungle). |
| Stand do Joinha | 70 | 1 | **Poder, Num Tem Eu:** do banco, dá +10 de dano aos ataques do seu ativo (não soma com outro Stand). **Joinha (1):** 20. |
| Encantadora (goon) | 70 | 1 | **Vem Cá, Meu Gadinho (1):** troca o ativo do outro por uma carta do banco dele, à sua escolha. **Chama Rosa (2):** 30 e Iludido. |
| Marreteiro do Coração (goon) | 100 | 3 | **Quebrar Tudo (1):** descarta o campo da mesa. **Marretada (3):** 90. |
| Moderador do BAN (goon) | 90 | 2 | **Ban de 7 Dias (2):** 30 e Silenciado. |

### Comuns (goons)
| Carta | HP | Recuo | Poder / Ataques |
|---|---|---|---|
| Cara de Coração | 70 | 1 | **Soco Iludido (1):** 20; +20 se tiver Encantadora na sua mesa. |
| Bug do Discord | 50 | 1 | **Glitch (1):** moeda; cara = 40, coroa = 0. |
| Notificação Morcego | 40 | 0 | **@everyone (1):** 10 e Notificado. |
| Emoji Pistola | 60 | 1 | **Reação 😡 (1):** 10 + 10 por goon na sua mesa. |
| Drone Vigia | 60 | 1 | **Poder, Câmera:** 1 vez por turno, olha a carta de cima do deck do outro. **Facho (1):** 20. |

### Campos (ficam na mesa e valem para os dois)
| Carta | Efeito |
|---|---|
| Piscina de Macarronada (lendário) | No começo de cada turno, cura 20 do ativo de quem vai jogar. |
| Toradolândia (épico) | Quem começar o turno com 3 cartas ou menos na mão compra 1 a mais. |
| Mansão do Inominável (épico) | Notificado tira 20 em vez de 10. Goons têm +20 HP. |
| Estacionamento Noturno (comum) | Goons recuam de graça. |
| Casa do Enzo Games (comum) | 1 vez por turno, cada jogador pode descartar 1 carta da mão para comprar 1. |
| São João do Butico (comum) | Comporta secreta: ataques não acertam o banco. |

Os números estão em `js/tcg-cartas.js`. O simulador (`node tools/tcg-simular.mjs 5000`) roda
milhares de partidas robô contra robô com decks sorteados. Resultado em 2026-09-26: toda carta fica entre
**46% e 53%** de vitória. O Marreteiro é o mais fraco (46%, custa 3 Aura e recua por 3); o Chorão e o Cabo
Côco são os mais fortes (53%). Está bom para começar; dá para ajustar depois de jogar de verdade.

## 4. Como funciona por dentro

### Já feito (fase 1 e 2, 2026-09-26)
- **`js/tcg-cartas.js`**: HP, ataques, poderes e recuo de cada carta, pelo mesmo `id` do
  `baralho-dados.js`. Separado para balancear o jogo sem mexer no sorteio dos pacotes.
- **`js/tcg-regras.js`**: o motor. JavaScript puro, sem tela; roda igual no navegador e no servidor.
  - `criarPartida`, `jogadasValidas`, `aplicar(estado, jogada) -> { estado, eventos }`.
  - **Determinístico:** toda sorte (embaralhar, moeda) vem de uma semente guardada no estado. A mesma
    semente com as mesmas jogadas dá sempre a mesma partida (`repetir`).
  - **Eventos:** cada jogada devolve a lista do que aconteceu, em ordem (`ataque`, `dano`, `nocaute`,
    `moeda`, `estado`, `troca`, `campo`, `turno`, `fim`...). A tela só anima esses eventos; ela nunca
    muda o estado sozinha. Isso é o que permite o visual estilo Hearthstone sem bagunçar as regras.
  - **`visaoDe(estado, jogador)`**: o estado sem a mão e o deck do outro (nem a ordem do próprio deck,
    nem a semente). É o que o servidor vai mandar para cada jogador no multiplayer.
- **`js/tcg-robo.js`**: o NPC, com 2 níveis. **Normal** pensa: derruba se dá, recua quem vai morrer,
  guarda Aura para o ataque maior, puxa o mais fraco com a Encantadora. **Fácil** às vezes erra de
  propósito. O normal vence o fácil 86% das vezes.
- **`tools/tcg-simular.mjs`**: partidas robô contra robô; mostra quem começa, turnos e vitória por carta.
- **`test/tcg-regras.test.js`**: 46 testes: cada regra, cada carta com efeito, 300 partidas aleatórias sem
  erro (nenhuma carta some ou duplica) e a repetição da partida.

### Contra o computador (próximo)
1. "Batalhar" → o servidor sorteia a **semente** e cria o registro da partida.
2. A partida roda **no navegador** (rápida, sem esperar o servidor a cada jogada).
3. No fim, o navegador manda a **lista de jogadas**. O servidor **refaz a partida** com o mesmo motor e
   a mesma semente, e o robô do outro lado também é conferido. Só se der vitória de verdade ele dá o prêmio.
   É a mesma ideia da "partida verificada" dos outros jogos.

### Contra outro jogador (depois, mas já previsto)
- O motor roda **no servidor**: cada jogada é uma chamada à API, que confere, aplica e salva o estado.
  Cada jogador recebe só a `visaoDe` dele e os eventos que pode ver (o `espiar` do Drone é privado).
- O Netlify não tem conexão em tempo real (websocket), então o outro recebe a vez perguntando ao
  servidor a cada 1 ou 2 segundos durante a partida. Dá para jogar ao vivo ou "por correspondência".
- Nada no motor muda para isso: o mesmo `aplicar` serve aos dois modos.

### Banco de dados (quando chegar a hora)
- `decks(id, user_id, nome, cartas, atualizado_em)`: até 5 decks por leitor.
- `batalhas(id, semente, jogadores, decks, modo, jogadas, estado, vencedor, criado_em)`.

### Recompensas (proposta, decidir na fase 6)
- Vitória contra o robô normal: **+30 créditos**, até **5 vitórias por dia** com prêmio.
- Conquistas: "Primeira Batalha", "Vencer com deck só de goons", "Nocautear o Cabo Côco".

## 5. O visual: estilo Hearthstone + Card Wars

A tela da batalha é uma **mesa em tela cheia** (como a abertura de pacotes), feita em HTML/CSS com
animações (Web Animations API). O motor gera os eventos; uma **fila de animação** toca um por vez.

### A mesa
- Metade de baixo é a sua, metade de cima a do adversário. Ativo no centro, banco de 3 atrás, mão em
  leque na borda de baixo (a do NPC de costas em cima).
- O **campo muda a mesa inteira** (a ideia do Card Wars): a carta de campo entra girando no centro e o
  fundo vira a arte daquele lugar (piscina de macarronada borbulhando, caverna roxa da Toradolândia,
  estacionamento escuro com o carro balançando...). Sem campo, fundo neutro de feltro.
- Placar de pontos (3 bolinhas cada lado), contador de deck, botão "Passar" grande.

### Como se joga (o toque)
- **Arrastar** carta da mão para o banco ou para o campo; as vagas possíveis acendem.
- **Aura**: um orbe no canto; arrasta até a carta, ele voa e gruda com brilho.
- **Atacar**: clica no ativo, os ataques aparecem como botões com custo e **previsão de dano**
  (`calcularDano`); ataque com alvo desenha uma **seta** até a carta escolhida (igual ao Hearthstone).
- Tudo que não pode ser feito fica apagado, com o motivo no toque (o motor já devolve o motivo em português).
- No celular: tocar em vez de arrastar funciona sempre.

### Animações (por evento)
| Evento | Animação |
|---|---|
| `baixar` | carta sai da mão, voa até a vaga e "carimba" na mesa com poeirinha |
| `aura` | orbe voa até a carta; contador de Aura pulsa |
| `ataque` | o atacante **dá um bote até o alvo** (avança, bate e volta com mola), como no Hearthstone |
| `dano` | número vermelho grande pulando da carta, carta treme; tela treme em dano ≥ 90 |
| `nocaute` | carta racha e se desfaz em pedaços/fumaça; ponto voa para o placar |
| `moeda` | moeda 3D gira no centro (cara = Enzo, coroa = Torado) |
| `estado` | ícone gruda na carta: sino (Notificado), cadeado BAN (Silenciado), coraçãozinho (Iludido) |
| `campo` | carta gira no centro e o fundo da mesa se transforma |
| `troca` | as duas cartas trocam de lugar em arco |
| `escudo` / `bloqueado` | parênteses gigantes se fecham na frente da carta |
| `cura` | número verde e brilho de macarronada |
| `fim` | "VITÓRIA" / "DERROTA" em letras de gibi, confete ou chuva |

- **Efeito especial por ataque** (o toque Card Wars): cada ataque pode ter um efeito próprio. Exemplos:
  Macarronada a 300% joga almôndegas em chamas; Vírgula-rangue lança vírgulas girando; Bala Dourada
  risca a tela em câmera lenta; Glitch do Bug pixeliza o alvo; Reação 😡 chove emojis; Marretada racha a mesa.
  A base toca um efeito genérico por tipo; os especiais entram aos poucos (fase 7).
- Arte nova **não é obrigatória**: partículas e ícones saem em CSS/SVG. Se o Henrique quiser, dá para
  gerar fundos das mesas de campo depois (prompts prontos quando chegar a hora).
- `prefers-reduced-motion`: sem bote nem tremor, só troca de números.

## 6. Fases

| # | Fase | Resultado | Situação |
|---|---|---|---|
| 0 | Regras e números | este documento | **feito** |
| 1 | Motor + testes | `tcg-regras.js`, `tcg-cartas.js`, 46 testes | **feito** |
| 2 | Robô + simulador | `tcg-robo.js` (fácil/normal), `tools/tcg-simular.mjs`, Aura de Reforço | **feito** |
| 3 | **Tela da batalha contra o NPC** | mesa, arrastar, ataques, fila de animações, fim de jogo; decks prontos para os dois lados | próximo |
| 4 | Montador de deck | aba "Batalha" na Ficha: montar e salvar decks (todas as cartas liberadas), deck pronto para quem não quer montar | |
| 5 | Tutorial | 1ª batalha guiada, passo a passo, contra o NPC fácil | |
| 6 | Servidor e prêmios | rotas, semente, conferência da partida, créditos com limite diário, conquistas | |
| 7 | Efeitos especiais | animação própria para cada ataque, fundos dos campos | |
| 8 | Contra outro jogador | desafiar pela ficha pública, batalha pelo servidor | depois |
| 9 | Conteúdo novo | cartas de **Truque** (itens: Macarronada cura 30, Bala "Blasfêmia"...), cores de Aura e fraquezas | depois |

## 7. O que a carta precisa mostrar
Hoje a carta tem arte, nome, número, raridade e frase. Na batalha ela precisa de **HP**, **ataques com
custo**, **poder** e **recuo**.
- Na mesa: carta menor com HP (barra e número), bolinhas de Aura, ícones de estado.
- Tocar/passar o mouse numa carta abre a **carta grande** com a frente normal e, embaixo, o quadro de
  combate (ataques, poder, recuo), no estilo das cartas de Pokémon.
- No fichário, a carta grande ganha o mesmo quadro.

### Cabo Côco: sempre banido (pedido do Henrique, 2026-09-26)
Em **todo lugar** em que o Cabo Côco aparece (fichário, carta grande, abertura, ficha pública, capa,
batalha, montador de deck, placar, mensagens), ele aparece com a **tarja de cena do crime "Conteúdo
banido em 456 países"**, com a arte borrada e o nome **"???"**. Tocar na tarja pede a senha do site.
Só quem já tem a conquista Acesso Confidencial vê a carta normal.
- A batalha desenha as cartas sempre com `EnzoBaralhoUI.carta()`, que já faz isso, e usa o mesmo
  `nomeVisivel()` para textos, avisos e leitor de tela. O nome real nunca aparece para quem não tem a conquista.
- Nenhum texto da carta pode dar a senha: por isso o ataque dele se chama **Arquivo Confidencial**.
