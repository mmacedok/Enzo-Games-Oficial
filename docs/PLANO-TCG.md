# Plano do Duelo Enzo (o "game" do TCG)

> Plano de jogo e de implementação do jogo de cartas do Baralho Enzo. **Fica só no branch `TCG`**
> (ver `CLAUDE.md`). Rascunho de 2026-09-26: regras e números são proposta, o Henrique aprova ou muda.

## 1. Qual sistema usar

**Recomendação: as regras do Pokémon TCG Pocket (o Pokémon de celular, 2024), adaptadas.**

| | Pokémon clássico | **Pokémon Pocket** | Marvel Snap |
|---|---|---|---|
| Tamanho do deck | 60 cartas | **20** (aqui: 15) | 12 |
| Energia | cartas de energia no deck | **1 por turno, automática** | sobe sozinha (1, 2, 3...) |
| Partida | 20–40 min | **5–10 min** | 3 min |
| Como vence | 6 cartas-prêmio | **3 pontos** | ganhar 2 de 3 lugares |
| Encaixa nas cartas de campo? | sim (Estádio) | sim (Estádio) | só se virarem os "lugares" |
| Fácil para quem nunca jogou | não | **sim** | sim |

Por que o Pocket:
- É Pokémon (a ideia do Henrique), mas sem o que o torna difícil: não tem 60 cartas nem cartas de energia no deck.
- A coleção tem só 24 cartas e cada leitor tem poucas. Um deck de 60 seria impossível; um de 15 dá.
- As 3 categorias que já existem viram as 3 peças do jogo sem inventar tipos novos:
  **personagem** = o "Pokémon" forte, **goon** = o "Pokémon" básico e barato, **campo** = o Estádio.
- É por turnos, um de cada vez. Isso é bom para jogar contra o computador no site e, depois, para
  jogar contra outro leitor sem servidor em tempo real (o Netlify não tem websocket).

O Marvel Snap é a alternativa: partidas de 3 minutos, jogadas ao mesmo tempo, os campos seriam os
3 lugares da mesa. Só que ele é menos "Pokémon", os campos sairiam do deck e jogar contra outro
leitor exige os dois online ao mesmo tempo.

## 2. Regras (proposta)

### O deck
- **15 cartas**, no máximo **2 cópias** da mesma carta e **1 de cada lendário**.
- Precisa de **pelo menos 1 personagem ou goon**.
- **Só entra carta que o leitor tem**: para colocar 2 Cara de Coração, precisa ter 2 no fichário.
- **Cartas da Casa (emprestadas):** quem tem menos de 15 cartas completa o deck com cópias cinzas
  emprestadas, só de cartas comuns. Assim todo mundo joga desde o 1º pacote, e abrir pacotes deixa o deck melhor.
- Virar repetida em pó pode deixar um deck salvo inválido. O deck é conferido de novo no começo de
  cada partida e mostra o que falta.

### A mesa
- **Ativo** (1 vaga): quem luta.
- **Banco** (3 vagas): quem espera.
- **Campo** (1 vaga, **compartilhada** pelos dois jogadores): o lugar onde a luta acontece.
- Deck, mão e pilha de descarte.

### Aura (a energia)
- Todo turno o jogador ganha **1 Aura** e prende em **um** personagem ou goon seu (ativo ou banco).
- Quem começa **não ganha Aura nem ataca** no 1º turno (é a regra do Pocket, compensa a vantagem).
- Ataques custam Aura (1, 2 ou 3). A Aura fica presa na carta; se ela cair, a Aura vai junto.
- Versão 1 sem cores de Aura. Cores (tipos e fraquezas) ficam para a fase 7.

### O turno
1. Compra 1 carta.
2. Em qualquer ordem:
   - põe personagens e goons no banco (quantos quiser, até 3);
   - joga **1 campo** (troca o que está na mesa, que vai para o descarte do dono; não pode jogar o mesmo campo que já está lá);
   - prende a Aura do turno;
   - usa os **Poderes** das cartas;
   - **recua** o ativo para o banco (uma vez, pagando o custo de recuo em Aura).
3. **Ataca** com o ativo (opcional). Atacar acaba o turno.

### Dano, nocaute e pontos
- Dano fica marcado na carta até ela cair ou ser curada. HP 0 = **nocaute**: a carta vai para o descarte.
- O dono põe outro do banco no ativo.
- Nocautear **goon, personagem comum, raro ou épico = 1 ponto**; **lendário = 2 pontos**.
- **Vence** quem fizer **3 pontos** ou deixar o outro sem ninguém na mesa.
- Deck vazio: o jogador só não compra; ninguém perde por isso. Limite de 30 turnos, e aí vence quem tiver mais pontos (empate vale empate).

### Começo
- Cada um compra **5 cartas**. Se não tiver personagem/goon na mão, embaralha e compra de novo (sem castigo).
- Os dois escolhem o ativo e o banco escondidos; aí revelam. Moeda decide quem começa.

### Estados (3, com nomes do universo)
- **Notificado** (veneno): leva 10 no fim de cada turno do dono. Sai ao recuar.
- **Silenciado** (paralisia): não ataca nem recua no próximo turno do dono.
- **Iludido** (confusão): ao atacar, moeda; se der coroa, o ataque falha e ele leva 20. Sai ao recuar.

## 3. As 24 cartas no jogo (proposta de números)

Legenda: **HP**, ataques como `Nome (custo em Aura): dano + efeito`, **Poder** (sem custo), **Recuo**.
Base: goon comum 40–70 HP, raro 70–100, épico 90–110, lendário 120–140; ~25 de dano por Aura.

### Lendários (valem 2 pontos)
| Carta | HP | Recuo | Poder / Ataques |
|---|---|---|---|
| Enzo Games | 140 | 2 | **Almôndega (1):** 30. **Macarronada a 300% (3):** 120. |
| Cabo Côco | 130 | 2 | **Poder, Conteúdo Banido:** com ele no ativo, o outro não joga campos. **Copo de Lágrimas (2):** 60 e cura 20 dele. |
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

Esses números são o chute inicial. A fase 2 roda **milhares de partidas robô contra robô** e mostra
quais cartas ganham demais ou de menos, para acertar antes de alguém jogar.

## 4. Como vai funcionar por dentro

### Arquivos novos
- **`js/tcg-cartas.js`**: HP, ataques, poderes e recuo de cada carta, pelo mesmo `id` do
  `baralho-dados.js`. O arquivo é separado para dar para balancear o jogo sem mexer no sorteio dos pacotes.
- **`js/tcg-regras.js`**: o motor do jogo. É JavaScript puro, sem tela. Roda igual no navegador e
  no servidor (mesmo formato do `baralho-dados.js`). Recebe `estado + jogada` e devolve o novo estado.
  É **determinístico**: toda sorte (embaralhar, moeda) vem de uma semente, então a mesma semente com
  as mesmas jogadas dá sempre a mesma partida.
- **`js/tcg-robo.js`**: o adversário do computador (fácil e normal). É regra simples: prende Aura
  no ativo, ataca se derruba, recua se vai morrer, e assim por diante.
- **`js/tcg.js`** + CSS: a tela da partida (tela cheia, como a abertura de pacotes) e o montador de deck.
- **`api/tcg.js`**: rotas de decks e partidas. **`test/tcg-regras.test.js`**, **`test/tcg.test.js`**.

### Banco de dados
- `decks(id, user_id, nome, cartas, atualizado_em)`: `cartas` = lista de ids; até 5 decks por leitor.
- `duelos(id, user_id, semente, deck, adversario, status, jogadas, resultado, criado_em)`.

### Contra o computador (anti-trapaça sem esforço)
1. "Duelar" → o servidor confere o deck contra o fichário (`colecao`), sorteia a **semente** e cria o duelo.
2. A partida roda **no navegador** (rápida, sem esperar o servidor a cada jogada).
3. No fim, o navegador manda a **lista de jogadas**. O servidor **refaz a partida** com o mesmo motor
   e a mesma semente. Só se der vitória de verdade ele credita a recompensa. É a mesma ideia da
   "partida verificada" dos outros jogos.

### Contra outro leitor (depois)
- **Por turnos guardados no banco**: cada jogada é uma chamada à API, que roda o motor e salva o estado.
  O outro recebe a vez (atualiza a cada poucos segundos, ou quando volta para a aba).
  Dá para jogar ao vivo ou "por correspondência" (uma jogada por dia, como xadrez online).
- Aqui o motor roda **no servidor**, e o navegador não vê a mão nem o deck do outro.

### Recompensas (proposta)
- Vitória contra o robô normal: **+30 créditos**, até **5 vitórias por dia** com prêmio.
  Contra o robô fácil, só as primeiras vezes (tutorial).
- Conquistas: "Primeiro Duelo", "Vencer com deck só de goons", "Nocautear o Cabo Côco".

## 5. Fases

| # | Fase | Resultado | Quem |
|---|---|---|---|
| 0 | **Aprovar regras e números** (este documento) | Henrique diz sim/muda | Henrique + Claude |
| 1 | **Motor + testes** | `tcg-regras.js`, `tcg-cartas.js`, testes de cada regra e de cada carta | Claude |
| 2 | **Robô + simulador** | robô fácil/normal; script `node tools/tcg-simular.mjs` roda 10 mil partidas e dá a taxa de vitória de cada carta | Claude (as rodadas longas podem ir para o Gemini) |
| 3 | **Montador de deck** | aba "Decks" na Ficha: arrastar do fichário, contagem 15/15, cartas emprestadas, erros claros; rotas de deck | Claude |
| 4 | **Tela do duelo contra o robô + tutorial** | mesa, arrastar carta, ataques, dano, nocaute, animações (reaproveita o 3D das cartas); 1º duelo guiado passo a passo | Claude |
| 5 | **Verificação e prêmios** | servidor refaz a partida, credita, limite diário, conquistas | Claude |
| 6 | **Contra outro leitor** | desafiar pela ficha pública, partida por turnos, histórico | Claude |
| 7 | **Conteúdo novo** | cartas de **Truque** (itens: Macarronada cura 30, Bala "Blasfêmia"...), cores de Aura e fraquezas, a próxima coleção | Henrique (ideias e arte) + Claude |

Cada fase fica testável sozinha. A 1 e a 2 não têm tela; dá para ver funcionando pelo simulador.

## 6. O que a carta precisa mostrar
Hoje a carta tem arte, nome, número, raridade e frase. No jogo ela precisa de **HP**, **ataques com
custo**, **poder** e **recuo**. Proposta:
- no fichário e na carta grande, um verso ou um "virar" mostra os números (a frente continua bonita);
- na mesa, a carta pequena mostra só HP, Aura presa e dano; tocar abre os detalhes.
- Nenhuma arte nova é obrigatória. Ícones (Aura, recuo, estados) dá para fazer em CSS/SVG.

## 7. Perguntas para o Henrique
1. **Pocket ou Snap?** (recomendado: Pocket)
2. **15 cartas, 3 pontos para vencer:** ok?
3. **Cartas da Casa** emprestadas para quem tem pouca carta: ok?
4. Os **poderes e ataques** da seção 3 combinam com os personagens? Algum está fora do jeito deles?
5. Nome do modo: "Duelo Enzo"? Outra ideia?
