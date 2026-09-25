# Artes da "Caçada ao Inominável" — instruções para a IA que vai desenhar

Este arquivo é para outra IA (ou pessoa) criar **todas as imagens definitivas** do jogo do
Degustador da Noite, um metroidvania inspirado em Hollow Knight (veja
`docs/PESQUISA-HOLLOW-KNIGHT.md` e `docs/PLANO-CACADA.md`). Hoje o jogo usa artes temporárias:
sprites antigos da Ronda (`assets/ronda/`) e desenhos feitos por código. Cada item abaixo diz
**o que desenhar, o tamanho, quantos quadros, onde salvar e como o jogo usa a imagem**.

Referências oficiais (leia antes de desenhar):
- Ficha do Degustador: `assets/Personagens/Degustador da noite Ficha.png`
- Ficha do Inominável: `assets/Personagens/O Inominavel Ficha.png`
- Sprites antigos (estilo e proporção que já funcionam no jogo): `assets/ronda/`

---

## 1. Regras gerais (valem para tudo)

**Estilo**
- Gibi / cartoon, igual às fichas: **contorno preto grosso**, cores chapadas com uma sombra
  simples, sem degradê realista. Leitura clara em tamanho pequeno.
- Clima de Hollow Knight: mundo **escuro e melancólico**, cada área com sua cor; o Degustador,
  os inimigos e os perigos precisam **se destacar do fundo**.
- Nada de texto escrito dentro das imagens (exceto logo, placas do "BAN" e similares indicados).

**Formato técnico**
- **PNG com fundo transparente** (menos os céus, que são opacos).
- Personagens e inimigos de lado, **olhando para a DIREITA** (o jogo espelha para a esquerda).
- Todos os quadros de uma animação têm **o mesmo tamanho** e **o mesmo ponto de apoio**
  (personagem centralizado na horizontal e **pés sempre na mesma linha**).
- Sem sombra no chão desenhada na imagem.
- Um arquivo por quadro: `correr-01.png`, `correr-02.png`…

**Escala no jogo**
Tela lógica 640×360, tile de 20×20 px. O Degustador tem ~14×26 px de colisão e é desenhado com
~44 px de altura. Desenhe grande (tamanhos abaixo) e com poucos detalhes finos: tudo é reduzido
~3× no jogo.

---

## 2. Degustador da Noite (jogador)

Pasta `assets/cacada/degustador/` · quadros **128×128** · pés na **linha 124**, corpo na
**coluna 64** · olhando para a direita.

Visual (da ficha): roupa de Batman mal feita, cinza, com remendos de fita adesiva e morcego
preto no peito; capa preta rasgada; cinto marrom; **gorro do Teemo** verde com orelhinhas e
óculos de aviador; óculos de grau; barba; **MP5K laranja**.

| Arquivo(s) | Quadros | O que mostrar |
|---|---|---|
| `parado-01..02` | 2 | Em pé, respirando, MP5K apontada para baixo. |
| `correr-01..06` | 6 | Corrida rápida, corpo inclinado, capa voando. |
| `pular`, `cair` | 1 + 1 | Subindo (pernas encolhidas) e caindo (braços abertos, capa para cima). |
| `golpe-frente-01..02` | 2 | **Coronhada**: bate com a coronha da MP5K para a frente (o ataque corpo a corpo). |
| `golpe-cima` | 1 | Coronhada para cima. |
| `golpe-baixo` | 1 | No ar, coronhada para baixo (usada para quicar/pogo). |
| `dash-01..02` | 2 | **Capa Janky**: corpo esticado para a frente, capa em rastro. |
| `pulo-duplo` | 1 | Cambalhota no ar com dois "parênteses" ( ) de energia dos lados. |
| `parede` | 1 | Deslizando na parede (parede à **esquerda** do desenho), faíscas das Luvas de Fita. |
| `agarrado` | 1 | Pendurado na quina pelas duas mãos (quina no canto superior direito, mãos na linha ~30). |
| `subir-01..02` | 2 | Subindo a beirada (cotovelo, depois joelho em cima). |
| `rajada-01..02` | 2 | Atirando a **Rajada da MP5K** para a frente, com clarão laranja. |
| `degustar-01..02` | 2 | **Degustar**: comendo um lanche (coxinha) com brilho de cura rosado. |
| `sentado` | 1 | Sentado no banco de praça, relaxado. |
| `dano` | 1 | Atingido: corpo jogado para trás, careta. |
| `morrer` | 1 | Caindo derrotado, gorro voando. |

## 3. O Inominável

Pasta `assets/cacada/inominavel/` · quadros **160×160** · pés na linha 154, coluna 80 ·
olhando para a **ESQUERDA**.

Visual: gordinho, cabelo castanho em **rabo de cavalo**, **barba**, **óculos**, camisa preta
**do Gorillaz** esticada, jeans, tênis, **notebook com o logo do Discord**; aura **roxa e verde**.

| Arquivo(s) | Quadros | O que mostrar |
|---|---|---|
| `parado-01..04` | 4 | Parado com o notebook, deboche, aura pulsando. |
| `fugir-01..04` | 4 | Correndo para a direita (olhando para a direita). Aparece e foge em várias salas. |
| `gritar-01..02` | 2 | "Boca de Fossa": boca aberta, linhas de grito (luta final). |
| `derrotado` | 1 | Sentado no chão, derrotado, olhos em X. |

## 4. Inimigos (o "chat corrompido" do Inominável)

Pasta `assets/cacada/inimigos/` · olhando para a **direita** · caixa de colisão entre
parênteses (o desenho pode passar um pouco dela).

| Arquivo(s) | Tamanho | Quadros | Descrição (e o inimigo de Hollow Knight que inspirou) |
|---|---|---|---|
| `capanga-01..04` | 128², pés linha 124 | 4 andar | Capanga do Coração (18×22): barbudo, camiseta branca com coração vermelho, jeans. Anda e vira na beirada (Crawlid). |
| `ping-01..02` | 64² centro | 2 asas | **Ping** (16×14): balão vermelho de notificação com "!" branco e asinhas de morcego. Paira e **persegue voando** (Vengefly). Versão `ping-caca` com brilho vermelho. |
| `emoji-01..02` | 64² centro | 2 | **Emoji Raivoso** (16×16): carinha amarela brava, bochecha vermelha. Voa em diagonal e **quica nas paredes** (Gruzzer). |
| `drone-01..02`, `drone-mirar` | 128² centro | 2 + 1 | **Drone do Inominável** (20×16): quadricóptero preto, luz roxa, olho vermelho. Fica de longe e **cospe bolas verdes em leque** (Aspid). `mirar` = olho brilhando antes do tiro. |
| `troll-andar-01..04`, `troll-preparar`, `troll-investida-01..02`, `troll-cansado` | 96², pés linha 92 | 8 | **Troll** (22×24): corcunda de moletom verde, sorriso enorme de troll. Vê você, **prepara** (olhos vermelhos, tremendo) e dá uma **investida** (Mosscharger). |
| `spam-01..03` | 64², pés linha 60 | 3 | **Spam Saltitante** (18×16): envelope branco com carimbo vermelho e dentinhos na aba. **Pula em cima de você** (Leaping Husk). Quadros: parado, agachado, no ar. |
| `bug-01..02` | 48² centro | 2 | **Bug** (14×14): besouro roxo-escuro com pixels de glitch rosa e ciano. **Anda em volta dos blocos**, inclusive paredes e teto (Tiktik). Desenhe de pé no chão; o jogo gira. |
| `moderador-guarda-01..02`, `moderador-erguer`, `moderador-golpe`, `moderador-recuperar` | 96², pés linha 92 | 5 | **Moderador** (20×28): armadura cinza, **escudo azul com "MOD"** na frente e **martelo do "BAN"**. Bloqueia golpes de frente, ergue o martelo e dá uma estocada (Husk Sentry). |
| `feiticeira-01..04`, `feiticeira-sumir`, `feiticeira-conjurar` | 128² centro | 6 | **Feiticeira** (20×28): cabelo roxo/rosa, casaco escuro, magia rosa. **Teleporta** e lança magia que persegue (Soul Twister). **Olhando para a direita** (a antiga olha para a esquerda). |
| `sombra-01..02` | 128², pés linha 124 | 2 | **Sombra do Degustador** (16×24): silhueta roxa-escura translúcida do Degustador, olhos roxos, fiapos de fumaça. Aparece onde você morreu e guarda suas vírgulas (a Shade de HK). |

## 5. Chefes

Pasta `assets/cacada/chefes/`.

| Arquivo(s) | Tamanho | Quadros | Descrição |
|---|---|---|---|
| `capanga-mor-ocioso-01..02`, `-preparar`, `-salto`, `-corrida-01..03`, `-marreta-01..02`, `-atordoado-01..02`, `-derrotado` | 192², pés linha 186 | 12 | **Capanga-Mor** (40×52): o capanga do coração gigante e bombado, com uma **marreta enorme**, bandana. Salta e cai soltando ondas de choque, corre e bate na parede (fica tonto com estrelinhas), marretada no chão (inspirado no False Knight). |
| `opressor-flutuar-01..04`, `-joinha`, `-grito`, `-glitch`, `-derrotado` | 256² centro | 8 | **O Opressor do Chat** (56×64): o Stand do Inominável da ficha — sombra gigante feita de **texto e código glitch**, **olhos roxos**, fumaça roxa e verde e uma mão fazendo **joinha**. |
| `punho` | 128×512 | 1 | O punho de joinha gigante que esmaga de cima (coluna escura com contorno roxo). |

## 6. Ataques e projéteis

Pasta `assets/cacada/efeitos/`.

| Arquivo(s) | Tamanho | Descrição |
|---|---|---|
| `golpe-01..03` | 96×96 | **Arco branco** da coronhada (meia-lua branca com borda laranja), apontando para a direita. O jogo gira para cima/baixo. |
| `rajada-01..02` | 96×32 | Rajada da MP5K: três balas com rastro laranja e um brilho em volta. |
| `bola-verde` | 24×24 | Cuspe do drone (verde ácido). |
| `magia-01..02` | 32×32 | Bola de magia rosa da feiticeira. |
| `onda-01..02` | 48×48 | Onda de choque do Capanga-Mor correndo pelo chão (poeira + arco laranja). |
| `pedra` | 32×32 | Entulho que cai do teto. |
| `palavra-caixa` | 128×32 | Caixa preta de fala com borda vermelha para as palavras do "Grito de Fossa" (o jogo escreve a palavra por cima: OFENSA, BUEIRO, CRINGE, BAN, RATIO…). |
| `glitch-01..02` | 16×16 | Quadradinhos de glitch verde/roxo (tiro do Opressor). |
| `poeira-01..03` | 32×32 | Poeira lilás de pulo e pouso. |
| `respingo-01..04` | 96×96 | Explosão roxa e laranja quando o Degustador cai. |
| `acerto-01..03` | 48×48 | Estrela branca de impacto quando a coronhada acerta. |

## 7. Objetos do mundo

Pasta `assets/cacada/objetos/`.

| Arquivo | Tamanho | Descrição / uso |
|---|---|---|
| `banco` | 96×48 | **Banco de praça** de madeira e ferro (o checkpoint, como os bancos de HK). |
| `placa` | 64×80 | Placa de madeira num poste (dicas do jogo). |
| `barraca-italolol` | 128×112 | Barraca da loja: toldo listrado vermelho e branco, balcão azul e o **ItaloLOL** atrás. |
| `alavanca-01..02` | 48×64 | Alavanca: fechada (vermelha) e aberta (verde). |
| `portao` | 64×64 | Grade de ferro do portão (repete na vertical). |
| `grade-arena` | 64×64 | Grade roxa brilhante que fecha a arena do chefe. |
| `parede-rachada-01..03` | 64×64 | Tijolos que **escondem segredos**: inteira, rachada, quase quebrando. |
| `virgulas-saco` | 48×48 | Saquinho de vírgulas (a moeda, como o Geo). |
| `fragmento` | 48×48 | **Fragmento de cogumelo**: um quarto do cogumelo vermelho de bolinhas brancas, brilhando. |
| `habilidade-orbe` | 64×64 | Orbe dourado brilhante das habilidades novas. |
| `espinhos`, `serra`, `trilho`, `plataforma`, `mola-01..02`, `telha`, `telha-rachada`, `marquise` | como na v1 | Espinhos (metade de baixo do tile), serra de 12 dentes (o jogo gira), plataforma móvel de metal 192×24, mola vermelha, telha de barro, marquise de madeira. |

## 8. Tiles e fundos das áreas

Pasta `assets/cacada/areas/<area>/` · tiles de **64×64 que emendam** nos 4 lados · fundos de
**1280×720** que emendam na horizontal (e na vertical nas áreas fechadas).

| Área | Cor principal | Tiles (`topo`, `meio`) | Fundo |
|---|---|---|---|
| `telhados` — Telhados da Toradolândia | roxo `#8a2be2` | telhado roxo com borda clara; tijolo roxo-escuro | céu noturno, cidade distante e **batsinal de vírgula** (já existem na Ronda) |
| `beco` — Beco das Chaminés | tijolo avermelhado `#c0583a` | beirada de tijolo; parede de tijolo escuro | parede de tijolos com canos e sombras de chaminés |
| `fabrica` — Fábrica do Chat | laranja industrial `#e08a2c` | chapa de metal com rebites; parede de aço | engrenagens, canos e um brilho laranja de forno embaixo |
| `torre` — Torre dos Servidores | ciano `#2bb3c0` | piso de metal com faixa ciano; parede de painéis | racks de servidores com LEDs piscando |
| `covil` — Covil do Inominável | verde tóxico `#5aff78` e roxo | piso escuro com borda verde; parede com código glitch | céu corrompido com faixas de glitch e a cidade ao longe |

## 9. Interface (HUD e telas)

Pasta `assets/cacada/ui/`.

| Arquivo | Tamanho | Descrição |
|---|---|---|
| `vaso-pontuacao` | 128×128 | O "vaso de alma": círculo com moldura branca e uma **vírgula** gravada; o jogo enche por dentro com tinta clara. |
| `cogumelo-cheio`, `cogumelo-vazio` | 48×48 | Vida: cogumelo vermelho com bolinhas brancas (cheio) e contorno apagado (vazio). |
| `logo` | 1024×256 | "CAÇADA AO INOMINÁVEL" em letras de gibi laranja com contorno preto, Degustador apontando a MP5K. |
| `titulo-fundo` | 1280×720 | Tela de título: o Degustador de costas olhando a cidade, o Inominável e o Stand ao longe. |
| `habilidade-<nome>` | 256×256 | Ícone grande de cada habilidade para a tela "NOVA HABILIDADE": `rajada`, `dash` (capa), `parede` (luvas com fita), `pulo2` (parênteses). |
| `mapa-banco`, `mapa-chefe`, `mapa-sombra` | 32×32 | Ícones do mapa. |

---

## 10. Modelo de prompt

> Sprite de jogo 2D estilo Hollow Knight com traço de gibi: contorno preto grosso, cores
> chapadas com sombra simples, clima noturno. `<descrição do item>`. Vista de lado, olhando
> para a direita. Fundo totalmente transparente, sem sombra no chão. Quadro de `<tamanho>` px,
> personagem centralizado, pés na linha `<linha>`. Mesma escala e mesmo design dos outros
> quadros da animação.

Exemplo (Ping, quadro 1 de 2):

> Sprite de jogo 2D estilo Hollow Knight com traço de gibi, contorno preto grosso. Um balão de
> notificação vermelho e redondo com um ponto de exclamação branco no meio, com duas asinhas de
> morcego pretas batendo (asas para cima). Visto de lado. Fundo transparente. Quadro de 64×64 px,
> centralizado.

## 11. Depois de criar (para quem for trocar no código)

1. Salve os arquivos nas pastas acima (`assets/cacada/...`).
2. Em `js/cacada.js`, troque os caminhos da constante `ARQUIVOS` (hoje apontam para
   `assets/ronda/...`) e acrescente as chaves novas.
3. Os sprites temporários têm o apoio na coluna 76; ao trocar, ajuste o `76` em
   `desenharJogador` para `64`. A feiticeira nova olha para a direita: tire `'feiticeira'` de
   `OLHA_ESQUERDA`.
4. O que hoje é desenhado por código fica em `DESENHOS` (inimigos), `TILES_AREA`/`TILES`
   (tiles), `camadaFundo` (fundos), `inominavel`, `desenharLoja`, `desenharColetaveis`,
   `desenharGolpe` e `desenharHud`. Troque cada desenho por `ctx.drawImage` da arte nova,
   mantendo o mesmo tamanho na tela.
5. Rode `npm test` e abra o jogo (clique no título da página do Degustador) para conferir.
