# Artes do Enzo Survivors: lista completa para gerar

Este arquivo é para **quem vai gerar as imagens** (você ou outra IA). Cada item diz:
- o **nome exato do arquivo e a pasta** onde ele entra no repositório;
- o **tamanho em pixels**;
- os **quadros** da animação e a **velocidade**;
- **onde aparece** no jogo;
- **o que desenhar**.

Como o jogo funciona: `docs/PLANO-ENZO-SURVIVORS.md`.

**Muita coisa já existe.** Os inimigos, os chefes, o Degustador e vários efeitos da Caçada são
reaproveitados como estão (seção 3). Não gere de novo o que está marcado como "já existe".

Sumário
1. Direção de arte
2. Regras técnicas (vale para todos os arquivos)
3. O que já existe e será reaproveitado
4. Personagens jogáveis
5. Armas e projéteis
6. Efeitos
7. Coletáveis
8. Chão e cenário
9. Ícones de armas e passivos
10. Interface e telas
11. Checklist (com prioridade)

---

## 1. Direção de arte
**Vale tudo da seção 1 do `docs/ASSETS-CACADA.md`**: traço, cores chapadas com uma sombra,
contorno `#120d1a` e a paleta. Os dois jogos são do mesmo universo e dividem inimigos, então
têm que parecer feitos pela mesma mão. O que muda no Enzo Survivors:

### 1.1 A frase que resume
> **Gibi noturno visto de cima**: o chão é visto de cima, escuro e calmo. Os personagens, os
> inimigos e os objetos são vistos **de lado**, como adesivos em pé sobre esse chão (é assim no
> Vampire Survivors). A tela vai ficar cheia de coisas, então **tudo que se mexe tem que ser
> lido de relance, pequeno**.

### 1.2 Legibilidade em tamanho pequeno (a regra mais importante)
No jogo um personagem aparece com **~40 px de altura** na tela lógica (960×540) e um inimigo
pequeno com ~20 px. Por isso:
- **Silhueta forte e simples.** Se a silhueta preenchida de preto não diz quem é, redesenhe.
- **Contorno grosso**: 8 px nos arquivos de 128 px, 6 px nos de 64 px e 4 px nos de 48 px ou
  menos. Sem detalhes internos menores que 6 px, porque somem.
- **Cabeça grande** (proporção de gibi, ~1/3 da altura) e uma cor dominante por personagem, para
  achar o seu no meio da horda:

| Personagem | Cor dominante |
|---|---|
| Enzo | laranja |
| Degustador | lilás |
| Hatsune | turquesa |
| Italolol | amarelo |
| Superkid | azul com capa vermelho-escura |

### 1.3 Código de cores (não pode ser usado para outra coisa)
| Cor | Significa | Exemplos |
|---|---|---|
| Vermelho/laranja quente (`#ff3b3b`, `#ff6a2a`) com anel escuro | **ataque de inimigo**, machuca | tiros de popup, drone, feiticeira |
| Dourado (`#ffd23f`) | **dá para pegar** | vírgula dourada, marmita, ímã, ícone da EnzoCoin |
| Rosa (`#ff8ca0`) | **cura** | brilho da coxinha, Uivo Dourado |
| Verde tóxico (`#5aff78`) | **O Inominável** | só ele e o rastro dele |
| Branco/lilás + a cor do personagem | **ataques do jogador** | espaguete, vírgulas, cartas |

O fogo do Espaguete Super Saiyajin é **amarelo-laranja com o miolo branco e sem anel escuro**,
para nunca ser confundido com tiro de inimigo.

### 1.4 Chão
O mapa é o **salão de um torneio de TCG à noite** (ver `PLANO-ENZO-SURVIVORS.md`, seção 5.5):
carpete de evento, fileiras de mesas de torneio, estandes e luz de palco. O chão é **escuro, de
baixo contraste e pouco saturado** (carpete azul-escuro com manchas de luz de refletor), e nunca
pode competir com a horda e com as vírgulas. Sem contorno preto no chão. Os objetos de cenário
(mesas, lixeiras, estandes) têm contorno de 6 px como os personagens, mas são mais apagados.
**Nada de logo ou carta de jogo que exista de verdade**: as cartas, caixas e banners são
inventados.

## 2. Regras técnicas
- **Formato:** PNG com fundo transparente. Os fundos de tela cheia são **JPG** com qualidade 85.
- **Direção:** todo personagem, inimigo e projétil olha **para a DIREITA**. O jogo espelha para
  a esquerda. **Não escreva texto** em nada que vai ser espelhado (a exceção são as "Besteiras",
  que não espelham).
- **Personagens (128×128):** os **pés tocam a linha y = 125** e o corpo fica centrado em
  x = 64. Todos os quadros de um mesmo personagem na mesma escala e na mesma linha dos pés.
  É a mesma regra do Degustador da Caçada.
- **Quadros:** um arquivo por quadro, numerado com dois dígitos: `andar-01.png`,
  `andar-02.png`…
- **Nomes:** minúsculas, sem acento, sem espaço, com hífen.
- **Pasta raiz:** tudo que é novo vai em **`assets/survivors/`**, nas subpastas indicadas. Mande
  pelo GitHub como fez na Caçada (upload na pasta certa).
- **Como gerar com IA sem perder a consistência:** gere cada animação **inteira numa única
  imagem** (folha com os quadros lado a lado, mesmo fundo liso) e depois recorte. Sempre anexe a
  ficha do personagem (`assets/Personagens/…`) e um quadro já aprovado como referência. Peça
  "mesmo personagem, mesma escala, mesma espessura de contorno". Eu recorto, limpo pixels soltos
  e alinho os pés se vier um pouco torto.

## 3. O que já existe e será reaproveitado (não gerar)
| Uso no Enzo Survivors | Arquivos existentes |
|---|---|
| **Degustador** (jogável) | `assets/degustador/parado-01..02`, `correr-01..06`, `dano`, `morrer` |
| Inimigos comuns | `assets/inimigos/`: `rato-01..04`, `bug-01..02`, `ping-01..02`, `spam-01..03`, `emoji-01..02`, `bolha-01..02`, `capanga-01..04`, `golpista-01..04` + `golpista-fugir-01..02`, `popup-01..02` + `popup-mirar`, `boneco-01..03`, `drone-01..02` + `drone-mirar`, `scrap-01..02`, `fake-pular-01..02`, `troll-andar-01..04` + `troll-investida-01..02`, `feiticeira-01..04` + `feiticeira-conjurar`, `moderador-guarda-01..02` + `moderador-golpe`, `recado-01..02` + `recado-mirar`, `sombra-01..02` |
| Elites | `assets/chefes/ratao-*` (Ratão), `assets/chefes/scrapeira-*` (Scrapeira) |
| Chefes | `assets/chefes/capanga-mor-*`, `coach-*`, `opressor-*` |
| O Inominável | `assets/inominavel/fugir-01..04` (correndo atrás de você), `gritar-01..02` (entrada), `derrotado` |
| Loja do Tio Pastel | `assets/npcs/tio-pastel-01..02`, `assets/objetos/barraca-pastel.png` |
| Efeitos | `assets/efeitos/acerto-01..03` (acerto), `poeira-01..03` (morte de inimigo pequeno), `cura-01..03`, `glitch-01..02` (chegada do Inominável) |
| Coxinha (cura) | `assets/efeitos/coxinha.png` |
| Botões | `assets/ui/botao-laranja.png`, `botao-laranja-sel.png`, `botao-escuro.png`, `botao-escuro-sel.png` |

**Pendências da Caçada que também servem aqui:** o capanga andando de verdade e o moderador
olhando para a esquerda (ver "Status" no `ASSETS-CACADA.md`). Na horda, o moderador espelhado
com "DOM/NAB" aparece o tempo todo.

## 4. Personagens jogáveis
Pasta: **`assets/survivors/personagens/<id>/`**. Todos os quadros de personagem são **128×128**,
com os pés na linha 125 e olhando para a direita.

Cada personagem precisa do **conjunto padrão**:
| Arquivo | Quadros | Velocidade | O que é |
|---|---|---|---|
| `parado-01.png`, `parado-02.png` | 2 | 3 quadros/s | respirando, parado de lado |
| `andar-01.png` … `andar-04.png` | 4 | 10 quadros/s | ciclo de caminhada: 01 perna da frente tocando o chão, 02 pernas passando, 03 a outra perna na frente, 04 pernas passando; braços ao contrário das pernas |
| `dano.png` | 1 | 0,2 s | encolhido, olhos fechados (o jogo pisca de branco por cima) |
| `morrer.png` | 1 | fica na tela de fim | caído de lado, espiral nos olhos, estilo gibi |
| `vitoria.png` | 1 | tela "Sobreviveu!" | pose de comemoração |
| `retrato.png` | **256×256** | — | busto de frente, fundo transparente. Aparece na escolha de personagem e na tela de fim |

### 4.1 Enzo Games — `assets/survivors/personagens/enzo/`
Ficha: `assets/Personagens/Enzo games ficha.png`. Gato laranja gordo, de barba e bigode pretos,
com a tatuagem tribal maori no braço esquerdo e smartwatch. Anda meio pesado, balançando a
barriga.
- Conjunto padrão.
- **Forma Super Saiyajin:** `ss-andar-01..04.png` (128×128, 12 quadros/s), com o mesmo ciclo
  da caminhada. O pelo fica amarelo-dourado e o cabelo vira **espaguete em chamas**, com aura de
  fogo alaranjada. Veja o quadro "Forma Super Saiyajin" da ficha.

### 4.2 Degustador da Noite — já existe (seção 3)
Só falta **`assets/survivors/personagens/degustador/retrato.png`** (256×256) e
`vitoria.png` (128×128), que não existem na Caçada. Ficha:
`assets/Personagens/Degustador da noite Ficha.png`.

### 4.3 Hatsune Neves — `assets/survivors/personagens/hatsune/`
Ficha: `assets/Personagens/Hatsune Neves Ficha.png`. Homem de barba e cavanhaque com óculos
(obrigatórios) e o cosplay da Miku: maria-chiquinhas turquesa longas, blusa cinza, gravata
turquesa e saia preta. As maria-chiquinhas balançam ao andar e são a silhueta dele.
- Conjunto padrão. Em `parado-01..02`, segura um leque de cartas na mão da frente.

### 4.4 Italolol — `assets/survivors/personagens/italolol/`
Ficha: `assets/Personagens/Italolol.png`. Cachorro amarelo estilo Odie, com manchas pretas,
orelhas marrons compridas, cabelo dividido preto e rosa, corrente de ouro e língua para fora.
Anda **em pé** (bípede) e saltitando.
- Conjunto padrão.
- **`latir.png`** (1 quadro, 128×128): boca bem aberta, orelhas para trás. O jogo mostra esse
  quadro no pulso da arma Latido.

### 4.5 Superkid — `assets/survivors/personagens/superkid/`
Ficha: `assets/Personagens/Superkid Ficha.png`. Homem-criança de cabelo preto bagunçado, com o
uniforme azul "SK" no peito, capa vermelha, botas vermelhas e cinto de utilidades. A capa
esvoaça atrás ao andar.
- Conjunto padrão. Como o jogo espelha o personagem, desenhe o peito **sem letras**, só com o
  escudo em losango (o "SK" some na escala do jogo de qualquer jeito). O "SK" aparece só no
  `retrato.png`.
- **`gritar.png`** (1 quadro): punhos fechados, boca aberta gritando. Aparece quando a arma
  Besteiras dispara.

## 5. Armas e projéteis
Pasta: **`assets/survivors/armas/`**. Tudo olha para a **direita**, porque o jogo gira e espelha.

| Arquivo | Tamanho | Quadros e velocidade | O que desenhar |
|---|---|---|---|
| `espaguete-01.png` … `espaguete-03.png` | 256×64 | 3 quadros em 0,25 s | um fio grosso de espaguete com molho, estalando como chicote da esquerda para a direita: 01 enrolado perto da mão (lado esquerdo), 02 meio esticado, 03 totalmente esticado com respingo de molho na ponta |
| `espaguete-ss-01.png` … `espaguete-ss-03.png` | 256×96 | 3 quadros em 0,25 s | o mesmo chicote **em chamas** amarelo-laranja com miolo branco (evolução Espaguete Super Saiyajin) |
| `fogo-chao-01.png` … `fogo-chao-03.png` | 64×64 | 8 quadros/s, em laço | foguinho no chão deixado pela evolução, visto de lado |
| `virgula.png` | 48×48 | 1 | uma vírgula tipográfica gorda, lilás `#b9a4ff`, com rastro branco curto atrás (para a esquerda) |
| `rajada-mp5k.png` | 48×24 | 1 | vírgula alongada e mais brilhante, como bala traçante lilás-branca (evolução Rajada MP5K) |
| `mp5k-clarao-01.png`, `mp5k-clarao-02.png` | 64×64 | 20 quadros/s | clarão de cano lilás, que aparece na frente do personagem durante a Rajada |
| `faca.png` | 64×32 | 1 | faca de mesa na horizontal, ponta para a direita, prateada com contorno |
| `garfo.png` | 64×32 | 1 | garfo na horizontal, dentes para a direita |
| `colher.png` | 64×32 | 1 | colher na horizontal, só no Faqueiro Completo (evolução) |
| `almondega-01.png`, `almondega-02.png` | 48×48 | 8 quadros/s, girando | almôndega com molho, 02 girada 45° |
| `almondega-gorda-01.png`, `almondega-gorda-02.png` | 96×96 | 8 quadros/s | almôndega enorme com brilho dourado nas bordas (evolução Barreira) |
| `latido-aura.png` | 256×256 | 1 (o jogo pulsa) | anel de ondas sonoras amarelas em volta do centro, **translúcido** (alfa 40–60%), estilo "AU AU" de gibi sem letras |
| `uivo-dourado.png` | 512×512 | 1 (o jogo pulsa) | o mesmo anel, maior, dourado e com brilho rosa suave (evolução Uivo Dourado) |
| `copo-refri.png` | 48×48 | 1 | copão de refri de lanchonete com tampa e canudo, caindo inclinado |
| `poca-refri-01.png` … `poca-refri-03.png` | 192×96 | 6 quadros/s, em laço | poça de refri cor de caramelo escuro **vista de cima** (elipse achatada), com bolhinhas de gás e cubos de gelo, borbulhando. Não pode ser vermelha |
| `poca-refri-grande-01.png` … `poca-refri-grande-03.png` | 256×128 | 6 quadros/s | poça maior e grudenta, com fios de melado e copos caídos (evolução Enchente de Refri) |
| `carta-01.png` … `carta-04.png` | 48×48 | 16 quadros/s, girando | carta de jogo estilo "Magic" com verso roxo e dourado, girando no próprio eixo: 01 de frente, 02 de lado fina, 03 de costas, 04 de lado |
| `criatura-01.png` … `criatura-04.png` | 128×128 | 10 quadros/s, correndo | pequena criatura saída da carta: um lobinho de energia turquesa com contorno escuro, correndo para a direita (evolução Invocação) |
| `palavra-poggers.png`, `palavra-lixoso.png`, `palavra-meme.png`, `palavra-nojento.png`, `palavra-bizarro.png` | 192×64 | 1 | a palavra em letras de gibi (estilo Bangers), branca com contorno `#120d1a` de 6 px e sombra azul, levemente inclinada. **Não espelha** |
| `palavra-explosao-01.png` … `palavra-explosao-03.png` | 128×128 | 3 quadros em 0,3 s | estouro de gibi (balão espetado amarelo e branco) quando a palavra explode |

## 6. Efeitos
Pasta: **`assets/survivors/efeitos/`**

| Arquivo | Tamanho | Quadros | O que desenhar |
|---|---|---|---|
| `level-up-01.png` … `level-up-04.png` | 192×192 | 12 quadros/s | coluna de luz dourada subindo do chão, com vírgulas douradas voando |
| `super-saiyajin-01.png` … `super-saiyajin-03.png` | 192×192 | 12 quadros/s, em laço | aura de chamas amarelo-laranja em volta de um corpo (centro vazio, fica atrás do Enzo) |
| `aura-farming-01.png`, `aura-farming-02.png` | 192×192 | 8 quadros/s, em laço | bolha de energia azul-clara em volta do Superkid, com números "67" pequenos flutuando (ver o quadro "Aura Farming" da ficha) |
| `marmita-abrir-01.png` … `marmita-abrir-04.png` | 256×256 | 8 quadros/s | marmita de alumínio abrindo, com luz dourada e vapor saindo: 01 fechada tremendo, 02 tampa saltando, 03 feixe de luz, 04 luz no máximo |
| `molho-explosao-01.png` … `molho-explosao-03.png` | 256×256 | 10 quadros/s | onda de molho de tomate se espalhando em círculo (o jogo amplia até cobrir a tela). Vermelho-molho **escuro** (`#a3261b`), não o vermelho de perigo |
| `congelado.png` | 64×64 | 1 | cristal de gelo azul-claro translúcido que fica por cima dos inimigos congelados |
| `inominavel-chegada-01.png` … `inominavel-chegada-03.png` | 256×256 | 6 quadros/s | rasgo verde tóxico no chão, com glitch, de onde o Inominável sai aos 15:00 |

## 7. Coletáveis
Pasta: **`assets/survivors/coletaveis/`**. Todos com **brilho dourado** (ou rosa, na cura),
contorno de 4 px e tamanho **48×48**, exceto quando indicado.

| Arquivo | Quadros | O que desenhar |
|---|---|---|
| `virgula-prata.png` | 1 | vírgula pequena prateada-azulada (XP 1). É a mais comum, então deve ser discreta |
| `virgula-dourada.png` | 1 | vírgula dourada com brilho (XP 10) |
| `virgula-arcoiris.png` | 1 | vírgula maior com gradiente arco-íris e estrelinha (XP 100) |
| `ima.png` | 1 | ímã de geladeira em forma de ferradura, com um adesivo de pizza |
| `garrafa-molho.png` | 1 | garrafa de molho de tomate com rótulo sem texto |
| `controle-pausado.png` | 1 | controle de videogame com o símbolo ⏸ no meio |
| `marmita-01.png`, `marmita-02.png` | 4 quadros/s | marmita de alumínio fechada com um laço dourado, pulsando de brilho (96×96) |

A cura usa a `assets/efeitos/coxinha.png`, que já existe. **Não há moeda para pegar no chão**:
os EnzoCoins vêm só da conversão dos pontos no fim da partida.

## 8. Chão e cenário: o torneio de TCG
Pasta: **`assets/survivors/cenario/`**

**Chão (vista de cima).** Tem que **emendar sem costura** nos 4 lados. Teste pondo 2×2 cópias
lado a lado: não pode aparecer linha nem padrão repetido óbvio.

| Arquivo | Tamanho | O que desenhar |
|---|---|---|
| `chao-carpete.png` | 512×512 | carpete de centro de convenções azul-escuro, com padrão geométrico discreto (losangos e linhas finas) e algumas manchas. **Baixo contraste**. É o chão principal |
| `chao-corredor.png` | 512×512 | piso liso cinza-azulado de salão, com uma fita adesiva amarela apagada marcando o corredor |
| `chao-palco.png` | 512×512 | piso de madeira escura do palco do torneio |

**Enfeites sobre o chão** (vista de cima, sem contorno, apagados):

| Arquivo | Tamanho | O que desenhar |
|---|---|---|
| `mancha-01.png` … `mancha-03.png` | 128×128 | manchas: refri derramado, molho, chiclete |
| `carta-caida-01.png`, `carta-caida-02.png` | 48×48 | carta de jogo caída no chão, vista de cima (01 de frente, 02 de costas), com arte inventada |
| `fita-chao.png` | 256×64 | pedaço de fita adesiva marcando fila ("fila da inscrição") |
| `luz-palco.png` | 512×512 | círculo de luz de refletor branco-azulado suave, que se apaga até ficar transparente nas bordas (o jogo põe por cima do chão, em modo "clarear") |

**Objetos em pé** (vistos de lado em 3/4, contorno de 6 px, **base na última linha da imagem**):

| Arquivo | Tamanho | O que desenhar |
|---|---|---|
| `mesa-torneio.png` | 384×160 | fileira de mesa comprida de torneio com toalha escura, 4 tapetes de jogo com cartas, dados e fichas de vida em cima, e cadeiras dobráveis vazias. **Bloqueia a passagem**: a colisão é a faixa de baixo, com 48 px de altura |
| `lixeira.png` | 96×96 | lixeira de salão, cinza, transbordando de copos (quebrável, solta coletável) |
| `lixeira-quebrada.png` | 96×96 | a mesma, tombada, com lixo espalhado |
| `caixa-pizza.png` | 96×96 | pilha de 3 caixas de pizza do lanche do torneio (quebrável) |
| `caixa-pizza-quebrada.png` | 96×96 | caixas espalhadas e abertas |
| `caixas-booster.png` | 96×96 | pilha de caixas de booster lacradas, com arte inventada (quebrável) |
| `caixas-booster-quebrada.png` | 96×96 | caixas rasgadas, com pacotinhos espalhados |
| `cadeira.png` | 64×96 | cadeira dobrável solta (decoração, não bloqueia) |
| `banner-torneio.png` | 128×320 | banner em pé "GRANDE TORNEIO" em letras de gibi (texto pode, porque banner não espelha) |
| `placar-rodadas.png` | 256×256 | quadro de cortiça com as chaves do torneio (linhas de chaveamento e papeizinhos, sem texto legível) |
| `estande.png` | 320×256 | estande de loja de cartas com prateleiras de caixas e uma lâmpada |

A barraca do Tio Pastel também aparece como decoração, usando `assets/objetos/barraca-pastel.png`,
que já existe.

## 9. Ícones de armas e passivos
Pasta: **`assets/survivors/icones/`**. Todos **128×128** (o jogo mostra em 64 px no cartão de
level up e em 32 px no HUD). O objeto fica centralizado, grande, com contorno de 6 px e **sem
moldura** (o jogo põe a moldura).

**Armas** (`arma-<id>.png`), com as evoluções numa **borda dourada brilhante** desenhada no
próprio ícone:

| Base | Evolução |
|---|---|
| `arma-espaguete.png` (garfo enrolado de espaguete) | `arma-espaguete-ss.png` (o mesmo, em chamas) |
| `arma-virgulas.png` (três vírgulas lilás) | `arma-rajada-mp5k.png` (a MP5K lilás; referência: `assets/mp5k.png`) |
| `arma-talheres.png` (faca e garfo cruzados) | `arma-faqueiro.png` (faca, garfo e colher em leque) |
| `arma-almondegas.png` (duas almôndegas) | `arma-almondega-gorda.png` (uma almôndega gigante brilhando) |
| `arma-latido.png` (focinho do Italolol latindo) | `arma-uivo-dourado.png` (o mesmo, dourado) |
| `arma-refri.png` (copão de refri com canudo) | `arma-enchente-refri.png` (copão virado com uma onda de refri) |
| `arma-cartas.png` (leque de cartas) | `arma-invocacao.png` (carta com o lobinho saindo) |
| `arma-besteiras.png` (balão de fala com "!?") | `arma-pontuacao-maxima.png` (balão gigante explodindo) |

**Passivos** (`passivo-<id>.png`):

| Arquivo | O que desenhar |
|---|---|
| `passivo-molho.png` | lata de molho de tomate |
| `passivo-gramatica.png` | livro grosso de gramática com uma vírgula na capa |
| `passivo-tenis.png` | tênis com asinhas |
| `passivo-ima.png` | ímã de geladeira em ferradura |
| `passivo-corrente.png` | corrente de ouro do Italolol |
| `passivo-canudinho.png` | canudinho dobrado listrado |
| `passivo-oculos.png` | óculos do Hatsune |
| `passivo-smartwatch.png` | smartwatch com tela acesa |
| `passivo-cogumelo.png` | cogumelo rosa (o mesmo desenho da Caçada: `assets/ui/cogumelo-cheio.png`) |
| `passivo-trevo.png` | trevo de quatro folhas feito de pimentas |

**Outros ícones** (128×128):

| Arquivo | O que desenhar |
|---|---|
| `abates.png` | caveirinha de gibi (contador de abates no HUD) |
| `relogio.png` | relógio de bolso |
| `enzocoin.png` | a moeda **EnzoCoin** (HUD da loja e tela de fim). Se o site já tem um desenho da EnzoCoin, use o mesmo; se não tem, faça uma moeda dourada grossa com a cabeça do Enzo em relevo |
| `cadeado.png` | cadeado (personagem ou item bloqueado) |
| `reroll.png` | duas setas em círculo (trocar os cartões) |
| `melhoria-vida.png`, `melhoria-dano.png`, `melhoria-velocidade.png`, `melhoria-ima.png`, `melhoria-sorte.png` | ícones da loja do Tio Pastel: coração, punho, tênis, ímã, trevo |

## 10. Interface e telas
Pasta: **`assets/survivors/ui/`**

| Arquivo | Tamanho | Onde aparece | O que desenhar |
|---|---|---|---|
| `logo.png` | 1024×256 | tela de título | "ENZO SURVIVORS" em letras de gibi. "ENZO" laranja com a cara do Enzo no "O"; "SURVIVORS" branco com vírgulas no lugar dos pingos. Mesmo estilo do `assets/ui/logo.png` da Caçada |
| `titulo-fundo.jpg` | 1920×1080 | tela de título | o salão do torneio de TCG à noite, com mesas viradas, cartas voando, luz de palco, os 5 personagens em pé no meio e uma horda de inimigos da Caçada chegando entre as mesas. Deixe o terço de cima livre para o logo |
| `cartao.png` | 720×200 | menu de level up | moldura de cartão de gibi (papel creme escuro, contorno grosso, cantos arredondados). Espaço à esquerda para o ícone (160×160) e o resto livre para texto |
| `cartao-sel.png` | 720×200 | cartão escolhido | o mesmo cartão com borda dourada brilhante |
| `cartao-evolucao.png` | 720×200 | cartão de evolução | cartão com fundo dourado e raios |
| `selo-novo.png` | 128×64 | canto do cartão | selo "NOVO!" em vermelho de gibi (é aviso, não perigo) |
| `moldura-retrato.png` | 288×288 | escolha de personagem | moldura quadrada de quadrinho, com o miolo de 256×256 vazio |
| `espaco-vazio.png` | 64×64 | HUD, espaços de arma e passivo | quadradinho escuro com borda clara |
| `barra-xp.png` | 64×24 | topo da tela | pedaço de barra de XP dourada (o jogo estica o miolo; os 16 px de cada ponta ficam fixos) |
| `barra-xp-fundo.png` | 64×24 | topo da tela | o fundo vazio da barra |
| `sobreviveu.png` | 1024×256 | fim, quando chega aos 15:00 | "SOBREVIVEU!" em letras de gibi douradas |
| `derrotado.png` | 1024×256 | fim, quando morre | "DERROTADO…" em letras de gibi cinza-azuladas |
| `loja-fundo.jpg` | 1920×1080 | loja do Tio Pastel | a barraca de pastel dentro do salão do torneio, com lâmpada acesa e mesas ao fundo desfocadas; espaço à direita para a lista de melhorias. O Tio Pastel é desenhado por cima com `assets/npcs/tio-pastel-01..02` |
| `personagens-fundo.jpg` | 1920×1080 | escolha de personagem | quadro de inscrições do torneio, com as fichas dos personagens pregadas como se fossem jogadores inscritos (sem texto legível) |

## 11. Checklist (com prioridade)
**P1 = precisa para lançar. P2 = deixa melhor, e o jogo funciona sem (desenha por código).**

| Prioridade | Pasta | Arquivos | Qtd. |
|---|---|---|---:|
| P1 | `survivors/personagens/enzo/` | conjunto padrão (10) | 10 |
| P1 | `survivors/personagens/degustador/` | `retrato`, `vitoria` | 2 |
| P1 | `survivors/personagens/hatsune/` | conjunto padrão | 10 |
| P1 | `survivors/personagens/italolol/` | conjunto padrão + `latir` | 11 |
| P1 | `survivors/personagens/superkid/` | conjunto padrão + `gritar` | 11 |
| P1 | `survivors/armas/` | as 8 armas base: espaguete ×3, virgula, faca, garfo, almondega ×2, latido-aura, copo-refri, poca-refri ×3, carta ×4, palavra ×5 + palavra-explosao ×3 | 25 |
| P1 | `survivors/coletaveis/` | todos | 8 |
| P1 | `survivors/cenario/` | `chao-carpete`, `mesa-torneio`, `lixeira` (as 2), `caixa-pizza` (as 2), `caixas-booster` (as 2) | 8 |
| P1 | `survivors/icones/` | 8 armas base + 10 passivos + `abates`, `relogio`, `enzocoin`, `cadeado` | 22 |
| P1 | `survivors/ui/` | `logo`, `titulo-fundo`, `cartao`, `cartao-sel`, `moldura-retrato`, `sobreviveu`, `derrotado` | 7 |
| P2 | `survivors/personagens/enzo/` | `ss-andar-01..04` | 4 |
| P2 | `survivors/armas/` | evoluções: espaguete-ss ×3, fogo-chao ×3, rajada-mp5k, mp5k-clarao ×2, colher, almondega-gorda ×2, uivo-dourado, poca-refri-grande ×3, criatura ×4 | 20 |
| P2 | `survivors/icones/` | 8 evoluções, `reroll`, 5 melhorias | 14 |
| P2 | `survivors/efeitos/` | todos | 20 |
| P2 | `survivors/cenario/` | os outros 2 chãos, 7 enfeites, cadeira, banner, placar, estande | 13 |
| P2 | `survivors/ui/` | os outros 7 | 7 |
| | | **Total** | **192** (P1: 114, P2: 78) |

Quando mandar uma leva, é só dizer "subi as artes do Survivors". Eu confiro nome, tamanho e
alinhamento, limpo o que precisar e aviso o que falta, como fizemos na Caçada.
