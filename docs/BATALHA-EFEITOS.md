# Batalha dos Torados: efeitos especiais dos ataques (fase 7)

> **Fica só no branch `TCG`** (ver `CLAUDE.md`). Pedido do Henrique em 2026-09-26: desta vez **a
> arte vem antes do código**. Este arquivo lista todas as imagens dos efeitos, com prompt, tamanho e,
> quando é animação, o que cada quadro mostra. Depois que elas estiverem em `assets/Batalha/efeitos/`,
> o código é escrito em cima delas. Hoje a batalha usa efeitos genéricos em CSS (bote, número de dano,
> tremida, balão com o nome do ataque).

## 1. Dois tipos de imagem

### Peça (a maioria)
**Uma imagem só, parada**, com fundo transparente. O código faz o movimento: voar de uma carta até a
outra, girar, crescer, cair, tremer, se multiplicar em chuva. É o jeito mais seguro, porque a IA não
precisa desenhar a mesma coisa várias vezes igual.
- **512×512**, fundo transparente, o objeto **centralizado ocupando uns 85%** da imagem.
- Partículas pequenas (estrela, lágrima, emoji) podem ser **256×256**.
- Desenhe o objeto **"de lado", apontando para a direita** quando ele voa (bala, almôndega,
  vírgula): o código gira para a direção certa.

### Folha de quadros (só onde a forma muda: explosão, fumaça, chama, rachadura, glitch)
**Uma imagem com 4 quadros lado a lado, numa linha só**, contando a animação da esquerda para a direita.
- **2048×512** (4 quadros de 512×512), fundo transparente.
- Os 4 quadros têm **o mesmo centro e a mesma escala**: a explosão nasce no meio do quadro 1 e cresce
  no mesmo lugar. Nada de borda, número, linha separando ou texto entre os quadros.
- O código corta a folha em 4 partes iguais e toca uma depois da outra (uns 70 ms cada, cerca de
  0,3 s a animação toda), às vezes girando ou aumentando junto.
- Frase para começar todo prompt de folha:
  `Folha de sprites de animação com 4 quadros lado a lado numa única linha horizontal, cada quadro
  quadrado e do mesmo tamanho, mesmo ponto central em todos, fundo transparente, sem bordas, sem
  números, sem texto. Sequência:` + a descrição dos 4 quadros.
- **Se a IA não acertar os 4 numa imagem só:** gere cada quadro separado (512×512), usando o
  quadro 1 como imagem de referência para os outros, e salve como `<nome>-1.png` ... `<nome>-4.png`.
  Dá para juntar depois.

## 2. Estilo (colar em TODO prompt)
Anexe `assets/Batalha/logo.png` como referência de estilo e cole:
```
Efeito especial de jogo de cartas estilo desenho animado (Card Wars de Hora de Aventura) misturado
com tira de jornal vintage: contorno preto grosso de nanquim, cores chapadas e bem saturadas, brilho
forte, sombra dura, sem degradê realista, sem fundo, fundo transparente, sem texto (a não ser que o
prompt peça). Use a imagem de referência como guia de estilo e de cores (amarelo-ouro, laranja,
contorno preto).
```
Se a ferramenta de imagem tiver a opção **fundo transparente**, ligue. Confira as bordas: não pode
ficar um contorno branco em volta do objeto nem o quadriculado cinza desenhado.

## 3. Onde salvar
Todos em **`assets/Batalha/efeitos/`**, com exatamente o nome da tabela (PNG). O Claude das
instruções (`docs/INSTRUCOES-ASSETS-CLAUDE.md`) sabe o caminho.

## 4. Efeitos que todo ataque usa (prioridade 1)
| Arquivo | Tipo | Tamanho | Quando aparece |
|---|---|---|---|
| `fx-impacto.png` | folha 4 | 2048×512 | toda vez que um ataque acerta |
| `fx-poeira.png` | folha 4 | 2048×512 | nocaute, carta entrando na mesa, campo chegando |
| `fx-pow.png`, `fx-bam.png` | peça | 512×512 | letreiro por cima do impacto (sorteado; nos ataques de 50+) |
| `fx-ko.png` | peça | 512×512 | letreiro quando uma carta cai |
| `fx-cura.png` | peça | 512×512 | qualquer cura (Arquivo Confidencial, Piscina de Macarronada) |
| `fx-estrela.png` | peça | 256×256 | faísca solta: o código espalha várias em volta dos golpes |
| `fx-parentese.png` | peça | 512×512 | escudo (Degustador, Hatsune): o código espelha para fazer os dois lados |

**`fx-impacto.png`** (folha): `... Sequência: 1) um ponto branco pequeno com 4 riscos de faísca
saindo; 2) estrela de impacto de gibi amarela com borda laranja e contorno preto, pontas irregulares,
metade do quadro; 3) a mesma estrela no tamanho máximo, com anel branco de onda de choque em volta e
faíscas voando; 4) a estrela se desfazendo em pedaços e faíscas soltas, mais transparente.`

**`fx-poeira.png`** (folha): `... Sequência: 1) um tufo pequeno de poeira bege no chão, no meio;
2) nuvem de briga de desenho animado crescendo, bege e cinza, com estrelinhas amarelas dentro;
3) nuvem grande e redonda cobrindo quase o quadro todo, com contorno preto; 4) a nuvem se desfazendo
em fiapos e bolinhas de fumaça.`

**`fx-pow.png`**: `Letreiro de onomatopeia de gibi escrito "POW!", letras grossas e inclinadas
amarelas com contorno preto grosso, dentro de uma explosão vermelha pontuda, texto escrito exatamente
assim.` **`fx-bam.png`**: igual, escrito `"BAM!"`, letras laranja numa explosão azul.

**`fx-ko.png`**: `Letreiro "K.O.!" de luta de videogame, letras enormes vermelhas com contorno preto e
brilho amarelo, rachado no meio, com duas estrelinhas girando, texto escrito exatamente assim.`

**`fx-cura.png`**: `Símbolo de cura: cruz verde-limão brilhante com contorno preto, cercada de
brilhinhos dourados e um fio de espaguete dourado dando uma volta em espiral em torno dela.`

**`fx-estrela.png`**: `Uma estrela de 4 pontas amarela e branca brilhante, tipo faísca de desenho
animado, contorno preto fino.`

**`fx-parentese.png`**: `Um parêntese "(" gigante e grosso, dourado e metálico como um escudo, com
contorno preto, rebites e brilho, em pé, ocupando a altura toda da imagem.` (Só o sinal "(", sem
mais nada.)

## 5. Efeito de cada ataque
Coluna **"O que o código faz"** é só para entender a animação: não precisa desenhar o movimento, só a
imagem. Todo ataque ainda ganha o `fx-impacto` quando acerta.

### Lendários (prioridade 2)
| Carta | Ataque | Arquivos | O que o código faz |
|---|---|---|---|
| Enzo Games | Almôndega | `fx-almondega.png` (peça), `fx-molho.png` (peça) | a almôndega voa girando até o alvo e estoura numa mancha de molho que escorre |
| Enzo Games | Macarronada a 300% | `fx-meteoro.png` (peça), `fx-explosao-macarronada.png` (folha 4), `fx-300.png` (peça) | a tela escurece, o letreiro "300%" bate no meio, 5 almôndegas-meteoro caem do alto em diagonal e explodem em macarronada |
| Cabo Côco | Arquivo Confidencial | `fx-pasta-confidencial.png` (peça), `fx-tarja-censura.png` (peça) | a pasta voa, abre em cima do alvo e três tarjas pretas de censura riscam a carta; o Cabo Côco ganha o `fx-cura` |
| Degustador da Noite | Vírgula-rangue | `fx-virgula.png` (peça) | a vírgula gira e faz um arco até o alvo (qualquer carta) e volta para a mão dele |
| Degustador da Noite | Escudo de Parênteses | `fx-parentese.png` (a genérica) | dois parênteses gigantes fecham em cima do alvo como uma prensa; depois aparecem em volta do Degustador (escudo) |
| O Inominável | Bala Dourada | `fx-bala-dourada.png` (peça) | a tela fica em câmera lenta, a bala atravessa com um rastro dourado e o alvo treme forte |
| O Inominável | Poder: Besteira no Discord | `fx-balao-discord.png` (peça) | balão de mensagem sai do Inominável e gruda no ativo do adversário, que fica Notificado |
| Superkid | Farmar Aura | `fx-aura-coluna.png` (peça) | coluna de luz dourada sobe em volta do Superkid e uma orbe de Aura entra nele |
| Superkid | Aura de 67 Segundos | `fx-relogio.png` (peça), `fx-aura-coluna.png` | o relógio aparece girando os ponteiros rápido atrás dele e o golpe sai com a coluna de aura inclinada até o alvo |

**Prompts:**
- **`fx-almondega.png`**: `Uma almôndega de carne suculenta, redonda, com molho de tomate escorrendo e
  um fiozinho de espaguete preso, voando para a direita com riscos de velocidade atrás.`
- **`fx-molho.png`**: `Mancha de respingo de molho de tomate vermelho vista de frente, grande, com
  gotas voando em volta e um pedaço de manjericão, estilo splash de desenho animado.`
- **`fx-meteoro.png`**: `Almôndega em chamas como um meteoro, voando para a direita e para baixo,
  fogo laranja e amarelo atrás formando uma cauda comprida, faíscas.`
- **`fx-explosao-macarronada.png`** (folha): `Sequência: 1) um clarão laranja pequeno no meio;
  2) explosão de fogo laranja e amarela crescendo com fios de espaguete voando para fora;
  3) explosão no tamanho máximo, com espaguete, almôndegas e respingos de molho espalhados em círculo;
  4) fumaça escura e alguns fios de espaguete caindo, a explosão sumindo.`
- **`fx-300.png`**: `Letreiro "300%" enorme em letras de gibi grossas, amarelo que vira laranja, com
  contorno preto e chamas saindo de cima das letras, texto escrito exatamente assim.`
- **`fx-pasta-confidencial.png`**: `Pasta de arquivo de papel pardo aberta, cheia de papéis, com um
  carimbo vermelho torto escrito "CONFIDENCIAL" na capa, clipes e uma foto desfocada presa com clipe,
  texto escrito exatamente assim.`
- **`fx-tarja-censura.png`**: `Uma tarja preta retangular e comprida na horizontal, tipo censura de
  documento, com bordas levemente rasgadas e textura de marcador, bem mais larga que alta, sem texto.`
- **`fx-virgula.png`**: `Uma vírgula gigante dourada e grossa, com borda afiada como lâmina de
  bumerangue, brilho metálico, contorno preto, girando (riscos de movimento curvos em volta).`
- **`fx-bala-dourada.png`**: `Uma bala de revólver dourada e brilhante voando para a direita, com um
  rastro de luz dourada comprido atrás e faíscas.`
- **`fx-balao-discord.png`**: `Balão de mensagem de chat roxo-azulado de aplicativo de conversa, com
  vários emojis bravos e caveiras dentro e uma bolinha vermelha de notificação no canto, sem letras.`
- **`fx-aura-coluna.png`**: `Coluna de energia vertical dourada e laranja subindo, estreita embaixo e
  larga em cima, com faíscas e pequenas orbes amarelas girando dentro, ocupando a altura toda.`
- **`fx-relogio.png`**: `Relógio de bolso dourado aberto, com os ponteiros borrados de tão rápidos,
  mostrador brilhando em amarelo e o número 67 no meio do mostrador, texto escrito exatamente assim.`

### Épicos e raros (prioridade 3)
| Carta | Ataque / poder | Arquivos | O que o código faz |
|---|---|---|---|
| Chorão | Birra | `fx-lagrima.png` (peça 256) | o Chorão treme e jorra um leque de lágrimas que chovem no alvo |
| Chorão | Poder: Vou te Processar! | `fx-processo.png` (peça) | quando ele é atacado, a intimação voa de volta e bate no atacante |
| Sombra do Degustador | Teemo no Top | `fx-cogumelo.png` (peça), `fx-fumaca-roxa.png` | o cogumelo brota no pé do alvo, pisca e explode numa fumaça (verde) |
| Sombra do Degustador | Fumaça Roxa | `fx-fumaca-roxa.png` (folha 4) | a fumaça sai da Sombra e engole o alvo |
| Hatsune Neves | Poder: Invoco uma Carta de Magic | `fx-circulo-magico.png` (peça) | o círculo gira embaixo da Hatsune e uma carta nova sai dele para a mão |
| Hatsune Neves | Porta do Quarto | `fx-porta.png` (peça) | a porta aparece e bate com força na cara do alvo; depois o parêntese de escudo nela |
| ItaloLOL | Au! Aura! | `fx-au.png` (peça) | o letreiro "AU!" sai da boca dele com ondas de latido |
| ItaloLOL | 0/14/2 | `fx-kda.png` (peça) | o placar aparece em cima dele, o golpe acerta o alvo e ele também leva dano (tremida com fumacinha) |
| Stand do Joinha | Joinha | `fx-joinha.png` (peça) | a mão gigante desce do alto e esmaga o alvo |
| Stand do Joinha | Poder: Num Tem Eu | `fx-joinha.png` (a mesma, pequena) | um joinha pequeno sai do banco e gruda no ativo quando ele ataca |
| Encantadora | Vem Cá, Meu Gadinho | `fx-laco.png` (peça) | o laço rosa sai dela, pega a carta do banco do adversário e puxa para o ativo |
| Encantadora | Chama Rosa | `fx-chama-rosa.png` (folha 4) | a chama sobe no alvo, que fica Iludido |
| Marreteiro do Coração | Quebrar Tudo | `fx-marreta.png` (peça), `fx-rachadura.png` (folha 4) | a marreta bate no campo do meio da mesa, o chão racha e o campo cai fora |
| Marreteiro do Coração | Marretada | `fx-marreta.png`, `fx-rachadura.png` | a marreta gira por cima e desce no alvo, a mesa racha embaixo dele |
| Moderador do Discord | Ban de 7 Dias | `fx-martelo-ban.png` (peça), `fx-carimbo-ban.png` (peça) | o martelo desce, e um carimbo "BAN" fica marcado na carta por um instante |

**Prompts:**
- **`fx-lagrima.png`**: `Uma lágrima de desenho animado azul-clara grande e gorda, com brilho branco,
  contorno preto.`
- **`fx-processo.png`**: `Papel de intimação judicial enrolado com fita vermelha e um martelinho de
  juiz de madeira preso junto, voando para a direita, sem texto legível no papel.`
- **`fx-cogumelo.png`**: `Cogumelo venenoso pequeno e fofo, chapéu roxo com bolinhas verdes
  brilhantes, com um pavio aceso de bomba saindo do topo.`
- **`fx-fumaca-roxa.png`** (folha): `Sequência: 1) um fiapo de fumaça roxa saindo de baixo, no meio;
  2) nuvem roxa crescendo em espiral com olhinhos amarelos brilhando dentro; 3) nuvem roxa enorme
  cobrindo o quadro, com olhos amarelos e caveirinha de fumaça; 4) fumaça se abrindo em fiapos e
  sumindo.` (O código pinta de verde para o cogumelo do Teemo.)
- **`fx-circulo-magico.png`**: `Círculo mágico de invocação visto de cima, dourado e azul, com runas
  e símbolos geométricos (sem letras de verdade) e cartas pequenas desenhadas em volta, brilhando.`
- **`fx-porta.png`**: `Porta de quarto de madeira pintada de branco, com adesivos de anime e uma placa
  pendurada na maçaneta (placa sem texto), vista de frente, levemente torta como se estivesse batendo.`
- **`fx-au.png`**: `Letreiro de onomatopeia "AU!" de latido, letras grossas laranja com contorno
  preto, com ondas de som em arco saindo, texto escrito exatamente assim.`
- **`fx-kda.png`**: `Placa de placar de videogame retangular, escura com borda dourada, mostrando
  "0/14/2" em números brancos grandes, com uma caveirinha e um emoji chorando do lado, texto escrito
  exatamente assim.`
- **`fx-joinha.png`**: `Mão gigante fazendo sinal de joinha (polegar para cima), dourada e brilhante
  como uma estátua de troféu, contorno preto, raios de luz atrás.`
- **`fx-laco.png`**: `Laço de corda rosa-choque com a ponta amarrada em forma de coração, a corda
  enrolada em espiral, brilhinhos rosa em volta.`
- **`fx-chama-rosa.png`** (folha): `Sequência: 1) uma faísca rosa no pé do quadro; 2) chama rosa e
  magenta subindo em forma de coração, pequena; 3) chama em coração grande, cobrindo o quadro, com
  corações menores saindo; 4) a chama se apagando em fumaça rosa e coraçõezinhos soltos.`
- **`fx-marreta.png`**: `Marreta de demolição enorme com cabo de madeira e cabeça de ferro, com um
  coração vermelho pintado na cabeça, na diagonal, com riscos de movimento.`
- **`fx-rachadura.png`** (folha): `Sequência: 1) ponto de impacto com um risco de rachadura pequena no
  chão; 2) rachaduras em estrela se espalhando, lascas de concreto pulando; 3) cratera rachada no
  máximo, pedaços de chão voando e poeira; 4) as lascas caindo e a poeira baixando, rachadura
  parada.` (Visto de cima, como se a mesa rachasse.)
- **`fx-martelo-ban.png`**: `Martelo de ban gigante, cabeça preta com detalhes dourados e a palavra
  "BAN" gravada, cabo comprido, na diagonal descendo, raios de impacto, texto escrito exatamente assim.`
- **`fx-carimbo-ban.png`**: `Marca de carimbo vermelho torto escrito "BAN" dentro de um retângulo com
  bordas falhadas, textura de tinta, texto escrito exatamente assim.`

### Comuns (prioridade 4)
| Carta | Ataque / poder | Arquivos | O que o código faz |
|---|---|---|---|
| Cara de Coração | Soco Iludido | `fx-soco-coracao.png` (peça) | o punho voa até o alvo; com a Encantadora na mesa, ele sai maior e com corações |
| Bug do Discord | Glitch | `fx-glitch.png` (folha 4) | a carta do alvo "buga": o glitch pisca por cima; se a moeda der coroa, pisca só no Bug |
| Notificação Morcego | @everyone | `fx-notificacao.png` (peça 256) | uma revoada de bolinhas de notificação cerca o alvo, que fica Notificado |
| Emoji Pistola | Reação 😡 | `fx-emoji-bravo.png` (peça 256) | chove um emoji bravo por goon na sua mesa (mais goons, mais emojis) |
| Drone Vigia | Facho | `fx-facho.png` (peça) | o facho de luz sai do drone, varre a mesa e para no alvo |
| Drone Vigia | Poder: Câmera | nenhum | flash branco de foto (feito em código) antes de mostrar a mão do adversário |

**Prompts:**
- **`fx-soco-coracao.png`**: `Punho fechado com luva de boxe rosa com um coração vermelho desenhado,
  voando para a direita com riscos de velocidade e coraçõezinhos atrás.`
- **`fx-glitch.png`** (folha): `Sequência: 1) duas faixas horizontais finas de pixels rosa e ciano
  deslocadas; 2) blocos de pixels quebrados rosa, ciano e verde espalhados como imagem corrompida;
  3) tela de erro em pedaços, retângulos deslocados e chuvisco de pixels cobrindo o quadro; 4) só
  alguns pixels soltos sumindo.`
- **`fx-notificacao.png`**: `Bolinha vermelha de notificação de aplicativo com o símbolo "@" branco
  no meio, com asinhas de morcego pretas dos lados, texto escrito exatamente assim (só o @).`
- **`fx-emoji-bravo.png`**: `Emoji redondo vermelho de raiva com sobrancelhas franzidas e fumaça
  saindo da cabeça, estilo gibi com contorno preto (não o emoji do celular).`
- **`fx-facho.png`**: `Cone de luz de holofote amarelo-claro, estreito no lado esquerdo e largo no
  lado direito, com pontinhos de poeira brilhando dentro, bordas suaves, na horizontal.`

## 6. Resumo: tudo o que precisa gerar
**40 imagens** (33 peças e 7 folhas), em 4 levas por prioridade. Dá para testar no jogo a cada leva:
os ataques que ainda não tiverem efeito próprio usam só os genéricos.

| Leva | Arquivos |
|---|---|
| 1. Genéricos (8) | fx-impacto, fx-poeira, fx-pow, fx-bam, fx-ko, fx-cura, fx-estrela, fx-parentese |
| 2. Lendários (12) | fx-almondega, fx-molho, fx-meteoro, fx-explosao-macarronada, fx-300, fx-pasta-confidencial, fx-tarja-censura, fx-virgula, fx-bala-dourada, fx-balao-discord, fx-aura-coluna, fx-relogio |
| 3. Épicos e raros (15) | fx-lagrima, fx-processo, fx-cogumelo, fx-fumaca-roxa, fx-circulo-magico, fx-porta, fx-au, fx-kda, fx-joinha, fx-laco, fx-chama-rosa, fx-marreta, fx-rachadura, fx-martelo-ban, fx-carimbo-ban |
| 4. Comuns (5) | fx-soco-coracao, fx-glitch, fx-notificacao, fx-emoji-bravo, fx-facho |

Folhas de 4 quadros: `fx-impacto`, `fx-poeira`, `fx-explosao-macarronada`, `fx-fumaca-roxa`,
`fx-chama-rosa`, `fx-rachadura`, `fx-glitch`. Todo o resto é peça.

**Com texto (confira a grafia):** `fx-pow` (POW!), `fx-bam` (BAM!), `fx-ko` (K.O.!), `fx-300` (300%),
`fx-pasta-confidencial` (CONFIDENCIAL), `fx-relogio` (67), `fx-au` (AU!), `fx-kda` (0/14/2),
`fx-martelo-ban` e `fx-carimbo-ban` (BAN), `fx-notificacao` (@).
