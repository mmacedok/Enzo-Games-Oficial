# Plano: Enzo Survivors

> Escrito em 2026-09-27. É só o plano: nenhum código foi escrito ainda.
> Pesquisa que embasa este plano: `docs/PESQUISA-SOBREVIVENTES.md`.
> Lista de artes (nome, pasta, tamanho e animação de cada arquivo): `docs/ASSETS-ENZO-SURVIVORS.md`.
> Branch de trabalho: `enzo-survivors`.

## Decisões do Henrique (2026-09-27)
| Pergunta | Decisão |
|---|---|
| Nome | **Enzo Survivors** |
| Flappy Enzo | sai do site e fica **guardado** em `arquivo/flappy/`, como a Ronda |
| Ranking | por **inimigos derrotados** (pontos = abates) |
| Pontos | viram **EnzoCoins** (a moeda do site e do jogo) por uma **conversão** feita no servidor, **sem limite** por partida nem por dia (seção 7) |
| Personagens | 5: **sem o Cabo Côco** |
| Mapa | **um torneio de TCG** (seção 5.5) |
| Login | **obrigatório**, igual à Caçada |

## 1. O jogo em uma frase
Você escolhe um personagem do Enzo Games e anda pelo salão de um **torneio de TCG** invadido
pelos monstros do chat corrompido. As armas atacam
sozinhas, as hordas crescem minuto a minuto, e cada inimigo derrotado solta vírgulas de XP. A
cada nível você escolhe uma melhoria entre 3. Chefes aparecem aos 5, 10 e 14 minutos, e aos
15:00 chega **O Inominável**. Quantos inimigos você derrota até lá é a sua pontuação.

## 2. Regras da partida
- **Controle:** só andar, em 8 direções (WASD ou setas no teclado, analógico virtual no
  celular). Esc ou P pausa. Enter ou toque confirma no menu de level up. As armas disparam
  sozinhas.
- **Duração:** 15:00. Nesse momento todos os inimigos somem e **O Inominável** entra. Ele é
  rápido e quase imortal, e a partida acaba quando ele te pega. Chegar aos 15:00 dá o bônus
  "Sobreviveu" (+10% de pontos). Derrotá-lo é um segredo possível só com evoluções fortes
  (+500 pontos).
- **Vida:** barra sob o personagem. Não há regeneração natural; a cura vem de itens.
- **XP:** vem das **vírgulas** que os inimigos soltam (prata = 1, dourada = 10, arco-íris
  = 100). O ímã puxa as que estão dentro do alcance de coleta. O XP necessário cresce a cada
  nível: 5, 15, 30… (fórmula no `CONFIG`).
- **Level up:** o jogo pausa e mostra **3 cartões** (4 com o passivo Sorte). Cada cartão é uma
  arma nova, um nível a mais numa arma que você já tem, ou um passivo. Com todos os espaços
  cheios e no máximo, o cartão vira "coxinha (cura 30)".
- **Espaços:** 6 armas e 6 passivos. Armas vão até o **nível 8**, passivos até o **5**.
- **Baú (marmita):** cai de chefes e elites. Evolui uma arma, se a evolução estiver pronta. Se
  não estiver, sobe 1 a 3 níveis em itens que você já tem.
- **Evolução:** arma no nível 8 + o passivo certo em qualquer nível + abrir um baú. A arma troca
  pela versão evoluída.
- **Salão:** lixeiras, caixas de pizza e pilhas de caixas de booster espalhadas podem ser
  quebradas e soltam coletáveis (seção 5.4).

## 3. Personagens
Cada um começa com uma arma e tem um bônus próprio. Todos vêm das fichas em `assets/Personagens/`.
O Cabo Côco fica de fora.

| Personagem | Arma inicial | Bônus | Como libera |
|---|---|---|---|
| **Enzo Games** | Espaguete | +20% vida máxima. A 20% da vida vira **Super Saiyajin** por 10 s (+50% de dano, uma vez por partida) | desde o início |
| **Degustador da Noite** | Vírgulas | −10% no tempo de recarga | desde o início |
| **Hatsune Neves** | Cartas | +1 projétil em todas as armas a partir do nível 10 | derrotar 1000 inimigos no total |
| **Italolol** | Latido | +15% de velocidade e +10% de área | chegar aos 10:00 |
| **Superkid** | Besteiras | **Aura Farming**: na 1ª vez que zeraria a vida, fica imortal por **6,7 s** | derrotar o Coach |

## 4. Armas, passivos e evoluções
Os números abaixo são os **iniciais** (nível 1). Cada nível melhora um atributo, e a tabela
completa de níveis mora no `CONFIG` do core, calibrada nos testes de equilíbrio da fase 2.

### 4.1 Armas (8)
| Arma | Estilo | Nível 1 | Níveis até o 8 |
|---|---|---|---|
| **Espaguete** | chicote horizontal para o lado que olha | 10 de dano, recarga 1,3 s | +1 lado (costas), +dano, +área |
| **Vírgulas** | tiro no inimigo mais perto | 10 de dano, 1 vírgula, 1,2 s | +projéteis, −recarga, atravessa |
| **Talheres** | faca e garfo em linha reta, na direção em que anda | 6 de dano, 1 talher, 1,0 s | +talheres, +velocidade, atravessa |
| **Almôndegas** | 2 almôndegas orbitando o personagem | 8 de dano, 3 s ligadas a cada 6 s | +almôndegas, +duração, +raio |
| **Latido** | aura em volta que fere e empurra | 4 de dano a cada 0,4 s | +raio, +dano, −intervalo |
| **Refri Derramado** | copão de refri cai perto de um inimigo e vira poça que fere e **deixa lento** quem pisa | 8 por tique, poça de 3 s | +poças, +área, +duração |
| **Cartas** | carta que vai e volta como bumerangue | 12 de dano, 1 carta, 1,5 s | +cartas, +alcance, +dano |
| **Besteiras** | palavras ("POGGERS", "LIXOSO", "MEME"…) voam em direções aleatórias | 15 de dano, 3 palavras, 2 s | +palavras, +dano, explodem |

### 4.2 Passivos (10)
| Passivo | Efeito por nível (máx. 5) |
|---|---|
| **Molho de Tomate** | +10% de dano |
| **Livro de Gramática** | −8% de recarga |
| **Tênis** | +10% de velocidade |
| **Ímã de Geladeira** | +25% de alcance de coleta |
| **Corrente de Ouro** | +1 de armadura (dano recebido −1) |
| **Canudinho** | +10% de área |
| **Óculos** | +10% de duração |
| **Smartwatch** | +1 projétil (máx. 2 níveis) |
| **Cogumelo** | +20% de vida máxima |
| **Trevo de Pimenta** (Sorte) | +10% de sorte (4º cartão no level up, baús melhores) |

### 4.3 Evoluções (8)
| Arma (nível 8) | + Passivo | = Evolução | O que muda |
|---|---|---|---|
| Espaguete | Molho de Tomate | **Espaguete Super Saiyajin** | chicote em chamas dos dois lados, deixa fogo no chão |
| Vírgulas | Livro de Gramática | **Rajada MP5K** | rajada contínua de vírgulas, sem recarga |
| Talheres | Tênis | **Faqueiro Completo** | leque de talheres que atravessam tudo |
| Almôndegas | Cogumelo | **Barreira de Almôndega Gorda** | órbita permanente que também bloqueia tiros |
| Latido | Corrente de Ouro | **Uivo Dourado** | aura enorme que cura 1 a cada 10 abates |
| Refri Derramado | Canudinho | **Enchente de Refri** | poças seguem o personagem, se juntam e grudam os inimigos no chão |
| Cartas | Óculos | **Invocação** | cartas viram criaturas que caçam sozinhas por 5 s |
| Besteiras | Smartwatch | **Pontuação Máxima** | palavras gigantes que explodem em área |

## 5. Inimigos, chefes e ondas
**Os inimigos são os mesmos da Caçada**, com as artes que já existem em `assets/inimigos/` e
`assets/chefes/`. Vista de cima com personagens de lado é exatamente o estilo do Vampire
Survivors, então a arte lateral serve sem mudança. Espelhar para o lado da caminhada é a única
coisa que o código faz com elas.

### 5.1 Comportamentos (o core só precisa destes 6)
| Tipo | Faz | Exemplos |
|---|---|---|
| perseguidor | anda reto até o jogador | rato, bug, capanga, boneco, scrap |
| rápido | perseguidor com +80% de velocidade e pouca vida | ping, sombra |
| enxame | atravessa a tela em fila numa direção e some | spam, emoji |
| cerco | nasce em anel em volta do jogador e fecha | bolha |
| atirador | para a certa distância e atira em linha | popup, drone, feiticeira, recado |
| tanque/investida | lento com muita vida; às vezes dispara em linha reta | troll, moderador, golpista (rouba XP e foge; derrotado, devolve em dobro) |

### 5.2 Linha do tempo (15 minutos)
| Minuto | Entra | Evento |
|---|---|---|
| 0–1 | rato, bug | |
| 1–2 | + ping | |
| 2–3 | enxame de spam | |
| 3–5 | emoji, cerco de bolhas | |
| **5:00** | | **Chefe: Capanga-mor** (baú) |
| 5–7 | capanga, golpista | |
| 7–8 | popup, boneco | **Elite: Ratão** (baú) |
| 8–10 | drone, scrap, fake | |
| **10:00** | | **Chefe: Coach** (baú) |
| 10–12 | troll, feiticeira | |
| 12–13 | moderador, recado | **Elite: Scrapeira** (baú) |
| 13–14 | sombra + enxame misto | |
| **14:00** | | **Chefe: Opressor** (baú) |
| **15:00** | | **O Inominável** |

A vida dos inimigos cresce **+10% por minuto**, e cada onda tem um **mínimo de inimigos vivos**
e uma **taxa máxima de nascimento**. A taxa máxima é o que o anti-cheat usa (seção 7.3). O teto
de inimigos vivos é **500 no celular e 800 no PC**, detectado pelo tipo de toque e ajustável.

### 5.3 Pontos por abate
| Inimigo | Pontos |
|---|---|
| comum | 1 |
| elite | 25 |
| chefe | 50 |
| O Inominável | 500 |
| bônus por chegar aos 15:00 | +10% |

### 5.4 Coletáveis
| Coletável | Faz |
|---|---|
| Vírgula prata / dourada / arco-íris | XP 1 / 10 / 100. Se passar de 300 no chão, as mais antigas se juntam numa arco-íris |
| Coxinha | cura 30 |
| Ímã de geladeira grande | puxa todas as vírgulas da tela |
| Garrafa de molho | mata todos os inimigos comuns da tela (dá os pontos) |
| Controle pausado | congela os inimigos por 10 s |
| Marmita | o baú (seção 2) |

### 5.5 Mapa
**O Grande Torneio de TCG:** o salão de convenções da Toradolândia durante um torneio de card
game, à noite, invadido pelos monstros do chat corrompido (o Hatsune tem até um quadro "Grande
Batalha — TCG Torneio" na ficha).
- **Chão infinito que se repete:** carpete de evento (azul-escuro com padrão discreto), com
  faixas de piso liso nos corredores.
- **Ilhas de mesas de torneio** (fileiras de mesas com tapetes de jogo, cartas e cadeiras)
  surgem em pontos fixos de uma grade. Elas **bloqueiam** o jogador e os inimigos que andam; os
  que voam passam por cima. Inimigo que bate na mesa escorrega pelo lado, sem busca de caminho,
  igual ao Vampire Survivors (a mesa vira escudo, e isso é estratégia).
- **Quebráveis:** lixeiras, caixas de pizza e pilhas de caixas de booster.
- **Decoração:** banners do torneio, placar das rodadas, estandes, a barraca do Tio Pastel (a
  loja fora da partida é ela) e luzes de palco.
- Outros mapas (Esgoto, Feira, Orkut) ficam para depois do lançamento.

## 6. Entre partidas (meta-progresso)
**Uma moeda só: EnzoCoins**, a mesma do site. Não existe moeda solta para pegar dentro da
partida. Os EnzoCoins vêm **só** da conversão dos pontos no fim da partida (seção 7), porque o
servidor não tem como conferir moeda pega no chão.
- **Loja do Tio Pastel** (fora da partida): melhorias permanentes pagas em EnzoCoins, com
  5 níveis cada. São elas: +vida, +dano, +velocidade, +ímã, +sorte e +1 reroll de cartões.
  Preço proposto por nível: 30 / 60 / 100 / 150 / 250, o que dá 590 por melhoria e 3 540 para
  comprar tudo.
- A compra é feita **no servidor**: ele confere o saldo e desconta. O jogo só mostra.
- Os personagens são liberados por conquista (tabela da seção 3), não por EnzoCoins.

## 7. Pontuação, ranking, conversão e anti-cheat
### 7.1 Fluxo de uma partida
1. Ao começar: `POST /api/games/session/start { gameId: 'enzo-survivors' }`. O relógio do
   servidor começa (já existe).
2. Ao morrer: `POST /api/games/session/submit { runToken, score: pontos, metadata: { abates,
   tempo, personagem, nivel } }`.
3. O servidor valida o teto, grava no ranking e **credita os EnzoCoins** (7.2) na mesma
   resposta: `{ accepted, best, position, enzocoins: { ganhos, saldo } }`.

### 7.2 Conversão de pontos em EnzoCoins
- A conversão acontece **só no servidor** e só com partida **verificada**. O navegador nunca diz
  quanto ganhou.
- **Sem limite** por partida nem por dia (decisão do Henrique). O único teto é o do anti-cheat
  (7.3), que barra pontuação **impossível** e não pontuação alta.
- Função pura `api/enzocoins.js → enzocoinsDaPartida(gameId, pontos)`, com testes. A taxa é um
  número só no topo do arquivo. Proposta: **1 EnzoCoin a cada 25 pontos**, arredondado para
  baixo.

  Com os preços dos produtos que a moeda compra no site (de 200 a 900 EnzoCoins):

  | Partida | Pontos | EnzoCoins (1/25) | Mais barato (200) | Mais caro (900) |
  |---|---:|---:|---:|---:|
  | morreu cedo (~5 min) | ~800 | 32 | ~6 partidas | ~28 partidas |
  | média (~10 min) | ~2 500 | 100 | 2 partidas | 9 partidas |
  | boa (chegou aos 15:00) | ~5 000 | 200 | **1 partida** | ~5 partidas |

  Se quiser mais lento, a taxa 1/50 corta tudo pela metade.
- **Carteira de EnzoCoins:** nova tabela `enzocoins_movimentos (id, user_id, valor, motivo,
  referencia, created_at)`. `valor` é positivo no ganho da partida e negativo nas compras, e o
  saldo é a soma. Cada partida credita uma vez só (a `referencia` é a partida, com índice
  único). Qualquer outra parte do site que gaste EnzoCoins usa a mesma tabela.

### 7.3 Anti-cheat (teto de pontos)
- O core exporta `tetoPontos(segundos)`: a soma, onda a onda, da **taxa máxima de nascimento** ×
  o tempo + os pontos de elites e chefes que já nasceram + o Inominável + 10%. Vem do mesmo
  `CONFIG` que o jogo usa, igual ao `tetoFlappy`. Mudou o equilíbrio, o teto acompanha.
- O tempo usado é **no máximo 15:00 + 2 min**. Nenhuma partida dura mais que isso em tempo de
  jogo, então pausar por horas não aumenta o teto.
- Teste obrigatório: um robô que joga perfeito, matando tudo no instante em que nasce, **nunca**
  passa do teto. E o teto não passa de ~1,5× o que o robô consegue, para não ficar frouxo.
- **Sem limite de ganho, a defesa é vigiar:** o painel do admin ganha a lista "quem mais ganhou
  EnzoCoins hoje" e marca partidas acima de 90% do teto. Apagar uma partida suspeita
  (`/api/admin/scores`) lança um movimento negativo do mesmo valor, e o saldo pode ficar
  negativo se a pessoa já gastou.
- Isso não impede tudo. Quem mexer no jogo pelo navegador pode enviar partidas sempre perto do
  teto, cerca de 1,5× uma partida perfeita. Com limite diário isso teria um teto de prejuízo;
  sem limite, depende de o admin olhar a lista.

## 8. Arquitetura (como no padrão da casa)
| Arquivo | Conteúdo |
|---|---|
| `js/survivors-core.js` | regras puras (UMD, roda no Node): `CONFIG`, `criarJogo(semente, personagem, melhorias)`, `avancar(jogo, dt, entrada)`, `escolher(jogo, i)`, `tetoPontos`, pools, grade espacial, ondas, armas, colisão. Sem DOM |
| `js/survivors-dados.js` | tabelas: personagens, armas por nível, passivos, evoluções, inimigos, ondas |
| `js/survivors.js` | desenho, HUD, menus (título, personagens, loja, level up, pausa, fim), analógico, teclado, áudio, artes |
| `test/survivors-core.test.js` | contrato: level up, espaços, evolução, ondas, pools sem vazamento, teto de pontos, semente repetível |
| `tools/survivors-robo.js` | robô que joga partidas inteiras no Node com semente: equilíbrio (quanto tempo sobrevive cada build) e o teste do teto |
| `tools/survivors-desempenho.mjs` | Playwright: mede os ms por quadro no Chromium com o teto de inimigos |

Detalhes técnicos (todas as regras da seção 3 da pesquisa):
- **Visão lógica 960×540** (horizontal) ou **540×960** (celular em pé). O core não depende do
  tamanho da tela. É maior que os 640×360 da Caçada para caber a horda.
- Passo fixo de 1/60 s. A grade espacial fica em `Int32Array`, com células de 64 px.
- As mesas do torneio são retângulos fixos, gerados pela semente a partir da posição na grade do
  mapa. Só os pedaços perto da câmera existem, e a colisão com elas usa a mesma grade espacial.
- Pools de tamanho fixo: 800 inimigos, 400 projéteis, 600 vírgulas, 64 poças e 200 números de
  dano.
- Sprites pré-escalados uma vez por tamanho, e piscar branco pré-gerado.
- Modo "menos efeitos" automático quando o quadro passa de 14 ms.

## 9. Mudanças no site
| Arquivo | Mudança |
|---|---|
| `js/main.js` | `JOGOS.flappy` sai. `JOGOS.survivors` entra, com `exigeLogin: true` e o mesmo gatilho do logo da home (`data-flappy-trigger` vira `data-jogo-trigger`) |
| `index.html` | o atributo do logo |
| `api/anti-cheat.js` | `'enzo-survivors': tetoPontos`. `flappy-enzo` fica só para leitura (ranking antigo), sem aceitar partidas novas |
| `api/games.js` | a resposta do submit credita e devolve `enzocoins` |
| `api/enzocoins.js` + `api/schema.js` | conversão, carteira (`enzocoins_movimentos`), `GET /api/enzocoins` (saldo e extrato) |
| novas rotas `GET /api/games/save/enzo-survivors` e `POST /api/games/loja/enzo-survivors` | lê as melhorias e os personagens liberados; compra uma melhoria (confere saldo e desconta na mesma operação) |
| `js/admin.js` + `api/admin.js` | lista de quem mais ganhou EnzoCoins e partidas perto do teto |
| `js/auth-widget.js`, `js/admin.js` | nome do jogo, ranking, recorde, texto do convite de login ("recordes do Enzo Survivors") |
| `arquivo/flappy/` | `js/flappy*.js`, o teste, `tools/prepare-flappy-assets.js` e um README (como `arquivo/ronda/`). `assets/flappy/` fica onde está, porque os talheres e a macarronada viram artes do jogo novo |
| `README.md` | seção do Flappy vira a do Enzo Survivors |

## 10. Fases (cada uma termina com testes verdes e QA no navegador)
- [ ] **F1. Núcleo jogável com formas simples:** andar, câmera, chão, 3 inimigos, Vírgulas +
      Espaguete + Latido, vírgulas de XP, level up com 3 cartões, timer, morte, tela de fim,
      pools e grade, teste de desempenho com 800 inimigos, analógico.
- [ ] **F2. Conteúdo completo:** 8 armas, 10 passivos, 8 evoluções, baús, todas as ondas,
      elites, chefes, Inominável, coletáveis, robô de equilíbrio.
- [ ] **F3. Artes:** integrar tudo do `ASSETS-ENZO-SURVIVORS.md`, com as artes da Caçada
      primeiro (já existem) e as novas conforme chegarem. Sem arte, o jogo desenha formas.
- [ ] **F4. Conta e economia:** login obrigatório, ranking por pontos, teto de pontos,
      carteira de EnzoCoins e conversão, loja do Tio Pastel no servidor, personagens liberáveis,
      vigilância no admin.
- [ ] **F5. Troca no site:** o Flappy vai para `arquivo/flappy/` e o logo abre o Enzo
      Survivors. Push para a `main` só quando você pedir.

## Perguntas em aberto
1. **A carteira de EnzoCoins já existe** no que você tem só no seu computador? Se existir, me
   diga o nome da tabela e das funções (ou traga só essa parte para a `main`). Assim o jogo
   credita na mesma carteira e não cria uma segunda. Se não existir, a `enzocoins_movimentos`
   deste plano vira a carteira oficial.
2. A taxa: **1/25** (uma partida boa ≈ o produto mais barato) ou **1/50**?
3. Os nomes das armas e passivos, e as falas das "Besteiras" do Superkid, estão bons?
