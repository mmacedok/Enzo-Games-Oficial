# Batalha dos Torados — regras, cartas, efeitos e danos

O TCG do site Enzo Games (`batalha.html`). Este documento vale para a versão de regras **6** (`REGRAS_VERSAO` em `js/tcg-regras.js`).
Os números das cartas vêm de `js/tcg-cartas.js` (multiplicados por 20) e os textos de `js/baralho-dados.js`. Se uma regra mudar, o motor (`js/tcg-regras.js`) manda; este arquivo deve ser regenerado.

## 1. Objetivo

- Cada jogador começa com **6.000 de vida**. Vence quem zerar a vida do outro.
- Limite de **30 turnos** somados: vence quem tiver mais vida; vida igual é empate.
- Desistência é derrota. Online, 3 estouros de tempo seguidos também é derrota (inatividade).

## 2. Deck e começo

- **Deck:** 15 cartas, até 2 cópias de cada e só 1 de cada lendária, com pelo menos 1 personagem ou goon.
- Decks prontos: **Turma do Enzo**, **Legião do Mal** e **Bichos da Internet**.
- **Mão inicial:** 5 cartas. Mão sem lutador volta para o baralho e compra de novo, sem castigo.
- **Preparação:** cada um escolhe 1 lutador ativo e até 3 no banco.
- **Primeiro turno:** quem começa não ataca no 1º turno. Quem joga em segundo ganha **+1 Aura de Reforço** no 1º turno, e ela só pode ir para o banco.

## 3. O turno

Compra 1 carta. Depois, em qualquer ordem:

- **Baixar** um lutador (banco até 3; sem ativo, a carta entra direto como ativo).
- **Prender 1 Aura** numa carta (a Aura fica presa nela; atacar não gasta a Aura).
- **Jogar 1 campo** (substitui o campo que estiver na mesa; vale para os dois lados).
- **Recuar 1 vez** (paga a Aura do recuo).
- **Usar poderes** (1 vez por carta por turno, nos poderes que se ativam).
- **Devolver ao baralho:** até **2 cartas da mão** e **1 da mesa** por turno. A carta volta ao baralho embaralhado (não vai para a mão); a da mesa volta limpa, sem Aura e sem dano. Não é nocaute e não tira vida. Devolveu o ativo: escolhe outro do banco e o turno continua.
- **Atacar** ou **passar**, e o turno acaba.

**Mesa vazia não perde:** todo ataque vai direto no jogador até ele baixar alguém.

## 4. Ataque e dano

- **Alvos:** o lutador ativo do rival ou o **jogador** (arrastando até o rosto dele). Ataques com alvo "qualquer" (Vírgula-rangue e Bala Dourada) também acertam o banco, a não ser que o campo seja o São João do Butico.
- **Proteção do ativo:** golpe no jogador com o ativo dele na mesa entra com só **35%** do dano (arredondado para baixo).
- **Nocaute** (dano chega ao HP): o dono da carta perde vida conforme a raridade:

| Raridade | Vida perdida no nocaute |
|---|---|
| Comum | 750 |
| Raro | 1.125 |
| Épico | 1.500 |
| Lendário | 2.250 |

- **Golpe extra:** quem derrubou acerta o jogador de graça, com o mesmo dano cheio (sem os 35%). Veneno, contra-ataque e dano em si mesmo não dão golpe extra.
- **Nocaute de um golpe só** (o alvo estava com o dano em 0): o atacante fica virado (recarga).
- **Recarga (carta virada):** Macarronada a 300%, Vírgula-rangue, Bala Dourada e Ban de 7 Dias deixam a carta virada até o próximo turno do dono. Virada, ela não ataca, não usa poder e não recua, mas leva golpe.

## 5. Estados

| Estado | Efeito | Sai quando |
|---|---|---|
| Notificado | perde 200 de vida entre turnos (400 com a Mansão do Inominável) | volta ao banco |
| Iludido | ao atacar, joga moeda: coroa erra e ele leva 400 | volta ao banco |
| Silenciado | não ataca nem recua no próximo turno; depois fica imune por um turno | volta ao banco |
| Escudo | reduz o próximo golpe recebido | no turno seguinte |

## 6. Campos

Um campo por vez na mesa; vale para os dois lados. Cabo Côco no ativo impede o rival de jogar campos.

| Campo | Efeito |
|---|---|
| Piscina de Macarronada | cura 400 do ativo de quem vai jogar, no começo do turno |
| Toradolândia | quem começa o turno com 3 cartas ou menos na mão compra 1 a mais |
| Mansão do Inominável | Notificado tira 400 por turno; goons ganham +400 de vida |
| Estacionamento Noturno | goons recuam de graça |
| Casa do Enzo Games | 1 vez por turno, cada jogador devolve 1 carta da mão ao baralho e compra 1 (fora do limite de 2) |
| São João do Butico | os ataques não acertam o banco |

## 7. Online

- **Salas públicas:** "Outro jogador" tem **Lista de salas** e **Criar sala**. A sala fica 5 minutos na lista e o tempo recomeça enquanto a tela de espera do dono está aberta.
- **Relógio:** 60 segundos por turno; 3 estouros seguidos = derrota.
- **Revanche:** ao fim da partida, os dois podem pedir revanche (até 2 minutos): mesma dupla, mesmos decks, lados trocados.
- **Placar:** vitórias, derrotas e empates só das partidas online.

## 8. Créditos (para comprar pacotes no Baralho)

| Origem | Vitória | Derrota / empate |
|---|---|---|
| Batalha online | 500 | 150 |
| Batalha contra o NPC | 250 | 50 (até 10 partidas premiadas por dia, 90 s entre elas, desistir não rende) |
| Flappy Enzo | 100 créditos por ponto | — |

## 9. Resumo das cartas

Vida, recuo, poder e ataques (custo de Aura entre parênteses; dano já na escala do jogo).

| Carta | Raridade | Vida | Recuo | Poder e ataques |
|---|---|---|---|---|
| Enzo Games | Lendário | 2.800 | 2 Aura | Almôndega (1): 600 · Macarronada a 300% (3): 2.400 |
| Cabo Côco | Lendário | 2.600 | 2 Aura | Poder: Conteúdo Banido · Arquivo Confidencial (2): 1.200 |
| Degustador da Noite | Lendário | 2.600 | 1 Aura | Vírgula-rangue (1): 400 · Escudo de Parênteses (3): 1.800 |
| O Inominável | Lendário | 2.400 | 2 Aura | Poder: Besteira no Discord · Bala Dourada (3): 1.200 |
| Superkid | Lendário | 2.600 | 2 Aura | Farmar Aura (1): só efeito · Aura de 67 Segundos (2): 400 |
| Chorão | Épico | 2.200 | 2 Aura | Poder: Vou te Processar! · Birra (2): 1.000 |
| Sombra do Degustador | Épico | 1.800 | grátis | Teemo no Top (1): 400 · Fumaça Roxa (2): 1.000 |
| Hatsune Neves | Raro | 1.600 | 1 Aura | Poder: Invoco uma Carta de Magic · Porta do Quarto (2): 600 |
| ItaloLOL | Raro | 1.800 | 1 Aura | Au! Aura! (1): 400 · 0/14/2 (2): 1.400 |
| Stand do Joinha | Raro | 1.400 | 1 Aura | Poder: Num Tem Eu · Joinha (1): 400 |
| Encantadora | Raro (goon) | 1.400 | 1 Aura | Vem Cá, Meu Gadinho (1): só efeito · Chama Rosa (2): 600 |
| Marreteiro do Coração | Raro (goon) | 2.000 | 2 Aura | Quebrar Tudo (1): só efeito · Marretada (3): 1.800 |
| Moderador do Discord | Raro (goon) | 1.800 | 2 Aura | Ban de 7 Dias (2): 600 |
| Cara de Coração | Comum (goon) | 1.400 | 1 Aura | Soco Iludido (1): 400 |
| Bug do Discord | Comum (goon) | 1.000 | 1 Aura | Glitch (1): só efeito |
| Notificação Morcego | Comum (goon) | 800 | grátis | @everyone (1): 200 |
| Emoji Pistola | Comum (goon) | 1.200 | 1 Aura | Reação 😡 (1): 200 |
| Drone Vigia | Comum (goon) | 1.200 | 1 Aura | Poder: Câmera · Facho (1): 400 |

## 10. Cartas em detalhe

### Lutadores (personagens e goons)

#### Enzo Games — Lendário · personagem
_(Finalmente a quarta-feira.)_

- Vida 2.800 · Recuo 2 Aura
- Almôndega (1 Aura): 600 de dano.
- Macarronada a 300% (3 Aura): 2.400 de dano; depois a carta fica virada por 1 turno.
- Se for nocauteada, o dono perde **2.250** de vida.

#### Cabo Côco — Lendário · personagem
_(Conteúdo banido em 456 países.)_

- Vida 2.600 · Recuo 2 Aura
- Poder Conteúdo Banido: com ele no ativo, o adversário não joga campos.
- Arquivo Confidencial (2 Aura): 1.200 de dano e cura 400 dele.
- Se for nocauteada, o dono perde **2.250** de vida.

#### Degustador da Noite — Lendário · personagem
_(Vírgulas não lutam contra o crime. Eu luto.)_

- Vida 2.600 · Recuo 1 Aura
- Vírgula-rangue (1 Aura): 400 de dano em qualquer carta do adversário, até no banco; fica virado por 1 turno.
- Escudo de Parênteses (3 Aura): 1.800 de dano e segura 600 do próximo golpe que receber.
- Se for nocauteada, o dono perde **2.250** de vida.

#### O Inominável — Lendário · personagem
_(EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!)_

- Vida 2.400 · Recuo 2 Aura
- Poder Besteira no Discord (1 vez por turno): deixa o ativo do adversário Notificado (perde 200 de vida no começo de cada turno dele).
- Bala Dourada (3 Aura): 1.200 de dano em qualquer carta; fica virado por 1 turno.
- Se for nocauteada, o dono perde **2.250** de vida.

#### Superkid — Lendário · personagem
_(Quanto mais besteira ao redor, mais aura.)_

- Vida 2.600 · Recuo 2 Aura
- Farmar Aura (1 Aura): sem dano, ganha +1 Aura.
- Aura de 67 Segundos (2 Aura): 400 de dano, mais 400 por Aura que ele tem.
- Se for nocauteada, o dono perde **2.250** de vida.

#### Chorão — Épico · personagem
_(Vou te processar! (chorando))_

- Vida 2.200 · Recuo 2 Aura
- Poder Vou te Processar!: quem ataca o Chorão leva 400 de volta.
- Birra (2 Aura): 1.000 de dano.
- Se for nocauteada, o dono perde **1.500** de vida.

#### Sombra do Degustador — Épico · personagem
_(Ei, eu vou pegar Teemo no top.)_

- Vida 1.800 · Recua de graça
- Teemo no Top (1 Aura): 400 de dano e deixa o alvo Notificado.
- Fumaça Roxa (2 Aura): 1.000 de dano.
- Se for nocauteada, o dono perde **1.500** de vida.

#### Hatsune Neves — Raro · personagem
_(Invoco uma carta de Magic e fecho a porta do quarto.)_

- Vida 1.600 · Recuo 1 Aura
- Poder Invoco uma Carta de Magic (1 vez por turno): compra 1 carta.
- Porta do Quarto (2 Aura): 600 de dano e segura 400 do próximo golpe.
- Se for nocauteada, o dono perde **1.125** de vida.

#### ItaloLOL — Raro · personagem
_(Au! Aura! 0/14/2 e a culpa é do jungle.)_

- Vida 1.800 · Recuo 1 Aura
- Au! Aura! (1 Aura): 400 de dano.
- 0/14/2 (2 Aura): 1.400 de dano, mas ele leva 600.
- Se for nocauteada, o dono perde **1.125** de vida.

#### Stand do Joinha — Raro · personagem
_(Num tem eu, num tem 👍)_

- Vida 1.400 · Recuo 1 Aura
- Poder Num Tem Eu: no banco, dá +200 de dano nos ataques do seu ativo (não soma com outro Stand).
- Joinha (1 Aura): 400 de dano.
- Se for nocauteada, o dono perde **1.125** de vida.

#### Encantadora — Raro · goon
_(Vem cá, meu gadinho.)_

- Vida 1.400 · Recuo 1 Aura
- Vem Cá, Meu Gadinho (1 Aura): sem dano; você escolhe uma carta do banco do adversário e ela vira o ativo.
- Chama Rosa (2 Aura): 600 de dano e deixa o alvo Iludido (no ataque dele, joga moeda: se der coroa, ele erra e leva 400).
- Se for nocauteada, o dono perde **1.125** de vida.

#### Marreteiro do Coração — Raro · goon
_(EU VOU QUEBRAR TUDO POR ELA!)_

- Vida 2.000 · Recuo 2 Aura
- Quebrar Tudo (1 Aura): sem dano; descarta o campo em jogo.
- Marretada (3 Aura): 1.800 de dano.
- Se for nocauteada, o dono perde **1.125** de vida.

#### Moderador do Discord — Raro · goon
_(Você foi silenciado por 7 dias.)_

- Vida 1.800 · Recuo 2 Aura
- Ban de 7 Dias (2 Aura): 600 de dano e deixa o alvo Silenciado (não ataca nem recua no próximo turno dele); o Moderador fica virado por 1 turno.
- Se for nocauteada, o dono perde **1.125** de vida.

#### Cara de Coração — Comum · goon
_(Iludido, mas sempre está lá por ela.)_

- Vida 1.400 · Recuo 1 Aura
- Soco Iludido (1 Aura): 400 de dano, +400 se a Encantadora estiver na sua mesa.
- Se for nocauteada, o dono perde **750** de vida.

#### Bug do Discord — Comum · goon
_(Não é bug, é feature da Legião.)_

- Vida 1.000 · Recuo 1 Aura
- Glitch (1 Aura): joga uma moeda; cara dá 800 de dano, coroa dá 0.
- Se for nocauteada, o dono perde **750** de vida.

#### Notificação Morcego — Comum · goon
_(@everyone às 3 da manhã.)_

- Vida 800 · Recua de graça
- @everyone (1 Aura): 200 de dano e deixa o alvo Notificado.
- Se for nocauteada, o dono perde **750** de vida.

#### Emoji Pistola — Comum · goon
_(Reagiu com 😡 em todas as suas mensagens.)_

- Vida 1.200 · Recuo 1 Aura
- Reação 😡 (1 Aura): 200 de dano, +200 por goon na sua mesa (contando ele).
- Se for nocauteada, o dono perde **750** de vida.

#### Drone Vigia — Comum · goon
_(Nenhum estacionamento fica sem câmera por muito tempo.)_

- Vida 1.200 · Recuo 1 Aura
- Poder Câmera (1 vez por turno): olha a mão do adversário.
- Facho (1 Aura): 400 de dano.
- Se for nocauteada, o dono perde **750** de vida.

### Campos

#### Piscina de Macarronada — Lendário · campo
_(O que alguém poderia querer além de uma piscina de macarronada?)_

- Campo (vale para os dois lados)
- No começo de cada turno, cura 400 do ativo de quem vai jogar.

#### Toradolândia — Épico · campo
_(BEM-VINDO À TORADOLÂNDIA!)_

- Campo (vale para os dois lados)
- Quem começa o turno com 3 cartas ou menos na mão compra 1 a mais.

#### Mansão do Inominável — Épico · campo
_(Sim, Enzo Games... é ficção...)_

- Campo (vale para os dois lados)
- Notificado tira 400 por turno em vez de 200. Goons ganham +400 de vida.

#### Estacionamento Noturno — Comum · campo
_(Absolutamente nada nunca aconteceu aqui.)_

- Campo (vale para os dois lados)
- Goons recuam de graça.

#### Casa do Enzo Games — Comum · campo
_(Bem-vindo a Santa Maria. Trouxe macarronada?)_

- Campo (vale para os dois lados)
- 1 vez por turno, cada jogador pode devolver 1 carta da mão ao baralho e comprar 1 (não conta nas 2 devoluções do turno).

#### São João do Butico — Comum · campo
_(Vira à direita na mansão da Playboy.)_

- Campo (vale para os dois lados)
- Comporta secreta: os ataques não acertam o banco.

