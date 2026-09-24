# Artes da "Caçada ao Inominável" — instruções para a IA que vai desenhar

Este arquivo é para outra IA (ou pessoa) criar **todas as imagens definitivas** do jogo de
plataforma do Degustador da Noite. Hoje o jogo usa artes temporárias: sprites antigos da
Ronda (`assets/ronda/`) e desenhos feitos por código. Cada item abaixo diz **o que desenhar,
o tamanho, quantos quadros, onde salvar e como o jogo usa a imagem**.

Referências oficiais (leia antes de desenhar):
- Ficha do Degustador: `assets/Personagens/Degustador da noite Ficha.png`
- Ficha do Inominável: `assets/Personagens/O Inominavel Ficha.png`
- Sprites antigos (estilo e proporção que já funcionam no jogo): `assets/ronda/`

---

## 1. Regras gerais (valem para tudo)

**Estilo**
- Gibi / cartoon, igual às fichas: **contorno preto grosso**, cores chapadas com uma sombra
  simples, sem degradê realista. Leitura clara em tamanho pequeno.
- Noite: o mundo é **roxo e azul-escuro**; o Degustador e os perigos precisam **se destacar**
  do cenário (laranja da MP5K, amarelo das vírgulas, vermelho/prata dos perigos).
- Nada de texto escrito dentro das imagens (exceto o logo, item 9.1).

**Paleta base**

| Uso | Cores |
|---|---|
| Céu e cidade | `#07041a` `#1c0f45` `#3a1a6b` `#241447` |
| Telhados (tiles) | roxo `#8a2be2`, borda clara `#b77cff`, parede `#2a1450`, tijolo `#351a63` |
| Degustador | cinza da roupa `#6b6f78`, preto `#1b1b1b`, verde do gorro `#4c8c2b`, laranja MP5K `#ff6600`, fita adesiva `#c9b99a` |
| Inominável | camisa preta `#1b1b1b`, jeans `#4a6fa5`, cabelo/barba `#5a3b22`, pele `#e0a57a`, aura roxa `#a046ff` e verde `#5aff78` |
| Perigos | prata `#d8dde6` / `#b9c0cc`, vermelho `#c0203a` |
| Coletáveis | amarelo `#ffd400` |

**Formato técnico**
- **PNG com fundo transparente** (menos o céu, item 8.1, que é opaco).
- Personagens de lado, **olhando para a DIREITA** (o jogo espelha para a esquerda).
- Todos os quadros de uma mesma animação têm **o mesmo tamanho** e **o mesmo ponto de apoio**:
  personagem centralizado na horizontal (coluna do meio) e **os pés sempre na mesma linha**.
- Sem sombra no chão desenhada na imagem (o jogo não tem chão fixo embaixo do sprite).
- Um arquivo por quadro, nome com número: `correr-01.png`, `correr-02.png`…

**Escala no jogo (importante para o nível de detalhe)**
A tela lógica é 640×360 e cada tile tem 20×20. O Degustador ocupa **~14×26 px** de colisão e é
desenhado com uns **44 px** de altura. Por isso desenhe grande (tamanhos abaixo) e com poucos
detalhes finos: tudo é reduzido ~3× no jogo.

---

## 2. Degustador da Noite (o jogador)

Pasta: `assets/cacada/degustador/` · quadros de **128×128** · **pés na linha 124**, corpo
centralizado na **coluna 64** · olhando para a direita.

Visual (da ficha): roupa de Batman mal feita, cinza, com remendos de fita adesiva e morcego
preto no peito; capa preta rasgada; cinto marrom com bolsos; **gorro do Teemo** verde com
orelhinhas e óculos de aviador; óculos de grau; barba; **MP5K laranja** na mão.

| Arquivo(s) | Quadros | O que mostrar |
|---|---|---|
| `parado-01..02.png` | 2 | Em pé, respirando (sobe/desce 1–2 px), MP5K apontada para baixo. |
| `correr-01..06.png` | 6 | Ciclo de corrida rápida estilo Super Meat Boy: corpo inclinado para a frente, capa voando para trás. Os 6 quadros fecham o ciclo. |
| `pular.png` | 1 | Subindo: pernas encolhidas, braço livre para cima, capa para baixo. |
| `cair.png` | 1 | Caindo: braços abertos, capa para cima. |
| `parede.png` | 1 | **Deslizando na parede**: de costas para a parede (a parede fica à **esquerda** do personagem no desenho), uma mão e um pé raspando nela, olhando para a direita, faíscas/poeira opcionais. |
| `agarrado.png` | 1 | **Pendurado na quina** pelas duas mãos: braços esticados para cima, a quina fica no **canto superior direito** do quadro (mãos na linha ~30, coluna ~80), corpo pendurado abaixo. |
| `subir-01..02.png` | 2 | Subindo a beirada: 1) cotovelo apoiado em cima, 2) joelho em cima. |
| `atirar-01..02.png` | 2 | Correndo e atirando: MP5K apontada para a frente, 2) com clarão laranja/amarelo no cano. O cano sai na altura do peito (linha ~70). |
| `atirar-ar.png` | 1 | Atirando no ar (pulando). |
| `morrer.png` | 1 | Atingido: corpo torto, olhos em X, gorro voando. (O jogo explode em partículas logo depois.) |

## 3. O Inominável (o objetivo de cada fase)

Pasta: `assets/cacada/inominavel/` · quadros de **160×160** · pés na linha 154, centralizado na
coluna 80 · olhando para a **ESQUERDA** (ele espera o Degustador, que vem da esquerda).

Visual (da ficha): homem gordinho, cabelo castanho comprido **preso em rabo de cavalo**,
**barba cheia**, **óculos**, camisa preta **do Gorillaz esticada** na barriga, calça jeans,
tênis; carrega um **notebook com o logo do Discord**. Atrás dele, o Stand **"O Opressor do
Chat"**: uma sombra preta enorme feita de texto/código "glitch", com **olhos roxos brilhando**
e **fazendo joinha** 👍, envolta em **fumaça roxa e verde**.

| Arquivo(s) | Quadros | O que mostrar |
|---|---|---|
| `parado-01..04.png` | 4 | Parado com o notebook, aura roxo-verde pulsando, cara de deboche. O Stand aparece atrás, meio transparente. |
| `provocar.png` | 1 | Gritando (poder "Boca de Fossa"): boca aberta, linhas de grito. Usado quando o Degustador chega perto. |
| `fugir-01..04.png` | 4 | Correndo para a direita (olhando para a direita), notebook debaixo do braço. Usado quando o Degustador toca nele e ele foge para a próxima fase. |
| `capturado.png` | 1 | Última fase: sentado no chão, derrotado, Stand sumindo em pixels. |
| `stand.png` | 1 | (opcional, 256×256) Só o Stand "Opressor do Chat", para desenhar separado com transparência. |

## 4. Inimigos

Pasta: `assets/cacada/inimigos/`. Todos olhando para a **DIREITA**.

| Arquivo(s) | Tamanho | Quadros | Descrição |
|---|---|---|---|
| `coracao-01..04.png` | 128×128, pés na linha 124 | 4 (andar) | Capanga do coração: homem barbudo, camiseta branca com **coração vermelho**, jeans, botas, cara de bravo (igual a `assets/ronda/inimigos/coracao-*`). Anda devagar patrulhando. Colisão 18×22. |
| `coracao-derrotado.png` | 128×128 | 1 | Achatado (levou pisão), estrelinhas na cabeça. |
| `drone-01..02.png` | 128×128, centro do drone no meio | 2 (hélices) | Drone do Inominável: quadricóptero preto com luz roxa e um **olho vermelho**, adesivo do Discord. Colisão 20×16. |
| `feiticeira-01..04.png` | 128×128, centro do corpo no meio | 4 (flutuar) | Feiticeira: cabelo roxo/rosa, casaco escuro, **magia rosa** na mão, flutuando. Colisão 20×28. **Atenção:** desenhar olhando para a DIREITA (a arte antiga olha para a esquerda). |
| `feiticeira-atacar.png` | 128×128 | 1 | Lançando a bola de magia. |
| `magia-01..02.png` | 32×32 | 2 | Bola de magia rosa `#ff4fd8` com brilho, raio visível ~10 px. |

## 5. Perigos e objetos

Pasta: `assets/cacada/objetos/`.

| Arquivo | Tamanho | Descrição / uso |
|---|---|---|
| `espinhos.png` | 64×64 | 3 espinhos de metal apontando para cima, pontas vermelhas, ocupando só a **metade de baixo** do tile. O jogo gira para fazer os do teto. |
| `serra.png` | 64×64 | Serra circular de metal com 12 dentes, centro vermelho. **Desenhe de frente** (o jogo gira). Raio de perigo = 15 de 20 px do tile, então a serra deve ocupar quase o quadro todo. |
| `trilho.png` | 64×16 | Trilho escuro por onde as serras andam (repete na horizontal/vertical). |
| `plataforma.png` | 192×24 | Plataforma móvel de metal (3 tiles de largura por ~8 px no jogo), rebites, luzinha laranja embaixo. |
| `mola-01.png`, `mola-02.png` | 64×64 | Mola vermelha/prata: 1) normal, 2) comprimida (após o quique). |
| `telha.png`, `telha-rachada.png` | 64×64 | Telha de barro laranja: inteira e rachada (a rachada treme antes de cair). |
| `marquise.png` | 64×32 | Marquise/toldo de madeira que dá para atravessar por baixo: só a **faixa de cima** é "chão". |
| `bandeira-apagada.png`, `bandeira-acesa.png` | 64×128 | Ponto de controle: poste com bandeira triangular; apagada roxa-escura, acesa **laranja com uma vírgula branca**. Base do poste na linha 124. |
| `virgula.png` | 48×48 | A vírgula coletável (piada gramatical do Degustador): vírgula amarela `#ffd400` gordinha com contorno preto e brilho. |
| `projetil.png` | 64×16 | Bala da MP5K indo para a direita, rastro laranja. |

## 6. Tiles do cenário (telhados)

Pasta: `assets/cacada/tiles/` · cada tile **64×64**, **tem que emendar** com ele mesmo nos 4
lados (sem borda visível quando repetido).

| Arquivo | Uso |
|---|---|
| `telhado-topo.png` | Tile de cima de um prédio/telhado: faixa roxa `#8a2be2` com borda clara em cima, tijolo embaixo. É o chão onde se pisa. |
| `telhado-meio.png` | Parede de tijolo roxo-escuro (interior dos blocos). |
| `telhado-canto-esq.png`, `telhado-canto-dir.png` | (opcional) topo com quina arredondada nas pontas. |
| `caixa.png` | Caixa de metal cinza com X (bloco sólido diferente). |
| `interior.png` | (opcional) parede de fundo do covil, mais escura, para as fases fechadas (1-2 e 1-6). |

## 7. Efeitos

Pasta: `assets/cacada/efeitos/`.

| Arquivo | Tamanho | Descrição |
|---|---|---|
| `poeira-01..03.png` | 32×32 | Nuvenzinha de poeira lilás ao pular/pousar. |
| `respingo-01..04.png` | 96×96 | Morte do Degustador: explosão roxa e laranja estilo gibi (sem sangue). |
| `onomatopeias.png` | 512×128 | (opcional) "SPLAT!", "POW!", "BOING!", "ZAP!" em letras de gibi; hoje o jogo escreve com a fonte Bangers. |

## 8. Fundo

Pasta: `assets/cacada/fundo/`.

| Arquivo | Tamanho | Descrição |
|---|---|---|
| `ceu.png` | 1280×720, **opaco** | Céu noturno roxo e azul-escuro, estrelas, lua cheia à esquerda, nuvens. Fica parado. |
| `cidade-longe.png` | 1280×640, transparente | Silhueta de prédios distantes com janelinhas amarelas. **Tem que emendar na horizontal** (borda esquerda continua na direita). Anda devagar (paralaxe 0,1). |
| `cidade-perto.png` | 1280×640, transparente | Prédios mais perto e mais escuros, caixas d'água, antenas. **Emenda na horizontal.** Paralaxe 0,3. |
| `sinal-virgula.png` | 256×256, transparente | O "batsinal" do Degustador: holofote projetando uma **vírgula** nas nuvens. |

## 9. Interface

Pasta: `assets/cacada/ui/`.

| Arquivo | Tamanho | Descrição |
|---|---|---|
| `logo.png` | 1024×256, transparente | Título "CAÇADA AO INOMINÁVEL" em letras de gibi laranja com contorno preto grosso, uma vírgula no lugar de algum acento, Degustador apontando a MP5K num canto. |
| `fase-1-1.png` … `fase-1-6.png` | 320×180 | (opcional) miniatura de cada fase para o menu. |
| `cadeado.png`, `estrela.png` | 64×64 | Fase bloqueada / todas as vírgulas pegas. |

---

## 10. Como pedir cada imagem (modelo de prompt)

Use este modelo e troque o que está entre `< >`:

> Sprite de jogo 2D em estilo de gibi, contorno preto grosso, cores chapadas com sombra
> simples. `<descrição do item>`. Vista de lado, olhando para a direita. Fundo totalmente
> transparente, sem sombra no chão. Quadro de `<tamanho>` px, personagem centralizado, pés na
> linha `<linha>`. Mesma escala e mesmo design dos outros quadros da animação.

Exemplo pronto (Degustador correndo, quadro 3 de 6):

> Sprite de jogo 2D em estilo de gibi, contorno preto grosso, cores chapadas. Vigilante
> gordinho com fantasia de Batman mal feita (cinza com remendos de fita adesiva, morcego preto
> no peito, capa preta rasgada), gorro verde do Teemo com orelhinhas e óculos de aviador,
> óculos de grau e barba, segurando uma submetralhadora MP5K laranja. Quadro 3 de 6 de um
> ciclo de corrida rápida, corpo inclinado para a frente, capa voando para trás. Vista de
> lado, olhando para a direita. Fundo transparente. Quadro de 128×128 px, pés na linha 124,
> corpo centralizado.

## 11. Depois de criar (para quem for trocar no código)

1. Salve os arquivos nas pastas acima (`assets/cacada/...`).
2. Em `js/cacada.js`, troque os caminhos da constante `ARQUIVOS` (hoje apontam para
   `assets/ronda/...`). As chaves (`parado`, `correr`, `pular`, `cair`, `parede`,
   `agarrado`, `atirar`, `morrer`, `coracao`, `drone`, `feiticeira`, `projetil`, `ceu`,
   `cidade`, `sinal`) correspondem aos itens 2, 4, 5 e 8; o que não tem chave ainda é
   desenhado por código (passo 4).
3. Os sprites temporários têm o apoio na coluna 76 (não 64); ao trocar, ajuste o `76` em
   `desenharJogador` para `64`. A feiticeira nova olha para a direita: tire `'feiticeira'`
   de `OLHA_ESQUERDA`.
4. Tiles, serras, espinhos, mola, plataforma, bandeira, vírgula e o Inominável hoje são
   desenhados por código (`TILES`, `desenharSerra`, `desenharInominavel`…). Troque cada
   desenho por `ctx.drawImage` da arte nova, mantendo o mesmo tamanho na tela.
5. Rode `npm test` e abra o jogo (clique no título da página do Degustador) para conferir.
