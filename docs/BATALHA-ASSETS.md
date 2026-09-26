# Batalha dos Torados: imagens para gerar

> **Fica só no branch `TCG`** (ver `CLAUDE.md`). Lista de toda a arte que a tela da batalha
> (`batalha.html`) já sabe usar. Hoje tudo tem **placeholder em CSS**, então o jogo funciona sem
> nenhuma delas. As cartas já têm arte (`assets/Cartas/`); aqui é só a mesa e os enfeites.

## Como pôr uma imagem no jogo
> Quer que um Claude faça isso por você? Mande as imagens e peça para ele seguir
> `docs/INSTRUCOES-ASSETS-CLAUDE.md` (tem um pedido pronto para colar no começo).

1. Gere a imagem com o prompt abaixo.
2. Salve com **exatamente** o nome indicado dentro de **`assets/Batalha/`** (PNG).
3. Rode `npm run build`. Ele gera a versão web em `assets/web/` e registra a imagem em `js/images.generated.js`.
4. Pronto: a batalha usa a imagem sozinha, **sem mexer no código** (`js/batalha.js`, `ARTE`). Se o
   arquivo não existir, continua o placeholder.
5. Commit no `TCG` (com as variantes de `assets/web/`, `data/images.json` e `js/images.generated.js`).

## Bloco de estilo (colar no começo de TODO prompt)
É o mesmo das cartas, para a mesa combinar com elas:
```
Ilustração estilo tira de jornal vintage (Garfield, Jim Davis), traço à mão com contorno de nanquim
grosso e expressivo, cores quentes e saturadas, textura leve de papel de gibi e retícula de pontos.
SEM NENHUM TEXTO, letra, número ou balão na imagem (a não ser que o prompt peça).
```

## Prioridade
1. **Mesas dos 6 campos + mesa padrão** (é o que mais muda a cara do jogo: o fundo muda quando um campo entra).
2. **Logo** e **NPC Torado**.
3. **Orbe de Aura**, **moeda** e **ícones de estado** (hoje são emojis; funcionam, mas destoam).

---

## 1. Mesas (fundos da batalha)

**Regras para todas as mesas:**
- **Quadrado 1536×1536** (o jogo corta para caber no celular em pé e no computador deitado).
  O que importa fica no **centro**; as bordas podem ser cortadas.
- **Vista de cima, como um tapete de jogo (playmat)**, com o lugar desenhado de forma plana e
  decorativa, não uma cena com perspectiva funda.
- **Contraste baixo e escuro no meio**: as cartas ficam por cima e precisam aparecer. O jogo ainda
  escurece a imagem 35%, mas evite brancos fortes e muitos detalhes no centro.
- **Sem personagens** (as cartas são os personagens). No máximo objetos do lugar.
- Deixe uma **faixa horizontal mais calma no meio** (é onde fica a carta de campo e os avisos) e duas
  áreas mais calmas em cima e embaixo (onde ficam as cartas de cada jogador).

Final de todo prompt de mesa:
```
Composição quadrada 1:1 vista de cima como um tapete de jogo de cartas (playmat), plana e decorativa,
centro escuro e de baixo contraste para as cartas aparecerem por cima, bordas mais detalhadas,
sem personagens, sem texto.
```

### `mesa.png`: mesa padrão (sem campo)
- **Quando aparece:** começo da batalha e sempre que não tem campo na mesa.
- **Prompt:** `Feltro verde-escuro de mesa de jogo de cartas com costura dourada em volta, manchas de molho de tomate secas e migalhas de macarronada aqui e ali, um anel de copo, três cartas viradas esquecidas no canto, luz de luminária amarela vindo de cima.` + final de mesa.

### `mesa-piscina-de-macarronada.png`
- **Carta:** #019 Piscina de Macarronada (lendário). **Ref.:** `assets/Cartas/piscina-de-macarronada.png`.
- **Prompt:** `Superfície de uma piscina transbordando de macarronada vista de cima: fios de espaguete formando ondas e redemoinhos, almôndegas boiando nas bordas, cartas de Yu-Gi-Oh! molhadas de molho boiando nos cantos, borda de azulejo azul da piscina em volta, reflexos dourados de holofote, vapor.` + final de mesa. Molho **vermelho-escuro** no centro, não laranja claro.

### `mesa-toradolandia.png`
- **Carta:** #020 Toradolândia (épico). **Ref.:** `assets/Cartas/toradolandia.png` e o mapa do Zezo Verso.
- **Prompt:** `Chão de uma caverna high-tech subterrânea vista de cima: piso de pedra roxa com circuitos neon verde-água correndo nas rachaduras, fóssil de T-Rex gravado no chão, moeda gigante de 1 centavo num canto, pegadas de Teemo, luz roxa de monitores vindo das bordas.` + final de mesa.

### `mesa-mansao-do-inominavel.png`
- **Carta:** #021 Mansão do Inominável (épico). **Ref.:** `assets/Cartas/mansao-do-inominavel.png`.
- **Prompt:** `Mesa de madeira escura gótica de uma mansão abandonada vista de cima: toalha roxa rasgada, candelabros apagados nos cantos, cera derretida, vitral colorido projetando luz roxa e verde sobre a mesa, teias de aranha, relâmpago iluminando pela janela.` + final de mesa.

### `mesa-estacionamento-noturno.png`
- **Carta:** #022 Estacionamento Noturno (comum). **Ref.:** `assets/Cartas/estacionamento-noturno.png` e o Capítulo 1.
- **Prompt:** `Asfalto de estacionamento de condomínio à noite visto de cima: faixas amarelas gastas de vagas, poças refletindo a lua, uma lanterna de carro quebrada no chão, marcas de pneu, luz fraca de poste amarelo vindo de um canto, sombra de teia de aranha.` + final de mesa. **Nada de câmeras** ("nada nunca aconteceu aqui").

### `mesa-casa-do-enzo-games.png`
- **Carta:** #023 Casa do Enzo Games (comum). **Ref.:** `assets/Cartas/casa-do-enzo-games.png` e o mapa do Zezo Verso (casa amarela no deserto).
- **Prompt:** `Tapete da sala da casa do Enzo Games visto de cima, em cima do chão de taco: tapete laranja de padrão mexicano, controle de videogame, prato de macarronada pela metade, gibis espalhados, areia de deserto entrando pela porta num canto, luz azulada da TV.` + final de mesa.

### `mesa-sao-joao-do-butico.png`
- **Carta:** #024 São João do Butico (comum). **Ref.:** `assets/Cartas/sao-joao-do-butico.png` e o mapa do Zezo Verso (morro de casinhas).
- **Prompt:** `Laje de concreto no alto do morro vista de cima: telhas coloridas das casinhas em volta formando uma borda de mosaico (rosa, amarelo, verde-água, azul), pipa enroscada, caixa d'água, uma comporta secreta de metal no chão com fresta de luz roxa, fios de luz cruzando.` + final de mesa.

---

## 2. Logo: `logo.png`
- **Tamanho:** 1600×800, **fundo transparente**.
- **Aparece:** no topo do menu da batalha (hoje é texto amarelo e laranja).
- **Aqui o texto é obrigatório:** "BATALHA DOS" pequeno em cima e "TORADOS" grande embaixo.
- **Prompt:** `Logo de jogo de cartas escrito "BATALHA DOS" em letras menores em cima e "TORADOS" enorme embaixo, letras de gibi grossas e inclinadas (estilo Bangers/onomatopeia), amarelo e laranja com contorno preto grosso e sombra dura, duas cartas cruzadas atrás como espadas, faíscas e uma almôndega em chamas no pingo do I, estilo tira de jornal vintage, fundo transparente, texto escrito exatamente assim, em português.`
- Confira a grafia: é comum a IA errar letras. "TORADOS", com um R só.

## 3. NPC: `npc-torado.png`
- **Tamanho:** 512×512 (aparece como um círculo de ~32 px na barra do adversário e pode crescer depois).
- **Quem é:** o adversário do computador é **o Torado**, dono da Toradolândia.
- **Ref.:** capa do spin-off `assets/Spin Offs/Torado/Capitulo 1/Capa/capa.png`. Diga: *"mantenha exatamente a aparência do personagem da imagem de referência"*.
- **Prompt:** `Retrato de busto do Torado (da imagem de referência) como o dono da mesa de cartas: sorriso convencido, embaralhando cartas com uma mão só, uma carta presa atrás da orelha, luz roxa da Toradolândia vindo de baixo, fundo roxo escuro liso com retícula, enquadramento centralizado para recorte em círculo.` + bloco de estilo.

## 4. Orbe de Aura: `aura.png`
- **Tamanho:** 256×256, **fundo transparente**, objeto redondo ocupando ~90%.
- **Aparece:** no botão de prender Aura e voando até a carta.
- **Prompt:** `Orbe de energia redonda amarela e laranja com núcleo branco brilhante, faíscas saindo, uma pequena espiral de espaguete dourado girando dentro, contorno preto grosso de gibi, fundo transparente, sem texto.`

## 5. Moeda: `moeda-cara.png` e `moeda-coroa.png`
- **Tamanho:** 512×512 cada, **fundo transparente**, moeda redonda de frente ocupando ~95%.
- **Aparece:** quando o jogo tira moeda (quem começa, Bug do Discord, Iludido).
- **Cara:** `Moeda de ouro vista de frente com o rosto do Enzo Games em relevo (da imagem de referência), borda serrilhada, brilho metálico, contorno preto de gibi, fundo transparente, sem texto.` Ref.: `assets/Personagens/Enzo games ficha.png`.
- **Coroa:** `O verso da mesma moeda de ouro com o Torado em relevo (da imagem de referência), borda serrilhada, brilho metálico, contorno preto de gibi, fundo transparente, sem texto.` Ref.: capa do Torado.
- As duas precisam ter **o mesmo tamanho, cor e borda** (gere a coroa com a cara como referência).

## 6. Ícones de estado (128×128, fundo transparente)
Aparecem pequenos (22 px) no canto da carta. Precisam ser **simples e legíveis bem pequenos**:
um desenho só, contorno preto grosso, fundo circular de cor chapada.

| Arquivo | Estado | Prompt (+ "ícone redondo, contorno preto grosso, cor chapada, fundo transparente, sem texto") |
|---|---|---|
| `estado-notificado.png` | Notificado (veneno) | `sininho de notificação vermelho tremendo, com um ponto vermelho de alerta, dentro de um círculo roxo` |
| `estado-silenciado.png` | Silenciado (ban) | `martelo de ban preto e dourado batendo, dentro de um círculo azul` |
| `estado-iludido.png` | Iludido | `coração rosa com olhinhos espiral de hipnose, dentro de um círculo rosa-claro` |
| `estado-escudo.png` | Escudo | `par de parênteses gigantes dourados formando um escudo, dentro de um círculo verde-água` |

---

## 7. Menu enfeitado (parte 2, pedido do Henrique em 2026-09-26)
São **9 imagens** para o menu da batalha (a tela com o logo, "Escolha seu deck" e "Contra quem?").
O código já está pronto: cada imagem aparece sozinha quando entra em `assets/Batalha/` e o build
roda; a que faltar continua como está hoje.

**Referência de estilo para todas:** anexe `assets/Batalha/logo.png` e diga *"use a imagem de
referência como guia de estilo e de cores"*, e cole o bloco de estilo do começo deste arquivo. Cores
do logo: amarelo-ouro que vira laranja, contorno preto grosso, sombra dura vermelho-escura, faíscas
e almôndegas em chamas. Fundo e molduras puxam para o roxo escuro da Toradolândia.

| Arquivo | Tamanho | Onde aparece |
|---|---|---|
| `fundo-menu.png` | 1536×1536 | Fundo da tela inteira do menu, atrás do logo |
| `faixa.png` | 1200×260, transparente | Faixa atrás de "Escolha seu deck" e "Contra quem?" (o texto é do jogo) |
| `caixa-turma.png` | 768×768, transparente | Caixa do deck Turma do Enzo (no lugar das 3 cartinhas) |
| `caixa-legiao.png` | 768×768, transparente | Caixa do deck Legião do Mal |
| `caixa-internet.png` | 768×768, transparente | Caixa do deck Bichos da Internet |
| `icone-npc-facil.png` | 256×256, transparente | Botão "NPC fácil" (no lugar do 🤖) |
| `icone-npc-normal.png` | 256×256, transparente | Botão "NPC normal" (no lugar do 😈) |
| `icone-outro-jogador.png` | 256×256, transparente | Botão "Outro jogador" (no lugar do 🧑‍🤝‍🧑; fica cinza até existir) |
| `icone-como-jogar.png` | 256×256, transparente | Botão "Como jogar" (no lugar do 📖) |

### `fundo-menu.png`
- **Quadrada**: no computador ocupa a largura toda; no celular mostra o meio. A parte de baixo é
  coberta por um degradê escuro, então o importante fica no **terço de cima e no meio**.
- **Prompt:** `Entrada de uma arena de cartas subterrânea na Toradolândia, vista de frente: grande
  portal de pedra roxa com circuitos neon verde-água nas rachaduras, fóssil de T-Rex gravado na
  parede, holofotes amarelos cruzando no alto, tochas feitas de almôndegas em chamas dos dois lados,
  cartas gigantes fincadas no chão como lápides, fumaça roxa no chão. O centro é uma parede escura e
  lisa de pedra (o logo e os botões ficam por cima), detalhes só nas bordas, a parte de baixo vai
  escurecendo até quase preto, sem personagens, sem texto.` + bloco de estilo.

### `faixa.png`
- **Prompt:** `Faixa de papel de gibi na horizontal, estilo fita de título de desenho animado, com as
  pontas dobradas para trás, amarelo-ouro com borda laranja e contorno preto grosso, sombra dura,
  duas faíscas pequenas nas pontas, miolo liso e vazio para escrever por cima, fundo transparente,
  SEM NENHUM TEXTO.` + bloco de estilo.
- O miolo precisa ser **claro e liso**: o jogo escreve "Escolha seu deck" em preto por cima.

### Caixas de deck (as 3)
- **Prompt base:** `Caixa de papelão de baralho de cartas, em pé, vista de 3/4, com a ilustração de
  <TEMA> na frente e a tampa um pouco aberta mostrando cartas dentro, cantos gastos, uma almôndega em
  chamas como selo no canto, contorno preto grosso de gibi, fundo transparente, sem texto.` + bloco de estilo.
- Use a carta principal como referência e diga *"mantenha exatamente a aparência do personagem"*.

| Arquivo | `<TEMA>` | Referência |
|---|---|---|
| `caixa-turma.png` | Enzo Games de braços cruzados, com Superkid e Hatsune Neves atrás, cores laranja e amarelo | `assets/Cartas/enzo-games.png` |
| `caixa-legiao.png` | O Inominável sorrindo, com a Encantadora e o Marreteiro do Coração nas sombras, cores roxo e verde | `assets/Cartas/o-inominavel.png` |
| `caixa-internet.png` | enxame de Bugs do Discord, Notificações Morcego e Drones saindo da tela de um monitor, cores azul e ciano | `assets/Cartas/bug-do-discord.png` |

### Ícones dos botões (os 4)
Aparecem com uns 64 px: **um desenho só, grande e simples**, contorno preto grosso, cores chapadas.
Prompt base: `Ícone de <DESENHO>, desenho único centralizado ocupando 90% da imagem, contorno preto
grosso de gibi, cores chapadas e fortes, fundo transparente, sem texto.` + bloco de estilo.

| Arquivo | `<DESENHO>` |
|---|---|
| `icone-npc-facil.png` | um robozinho de brinquedo de corda, redondo e fofo, com a chave de corda nas costas, segurando uma carta de cabeça para baixo, cara confusa |
| `icone-npc-normal.png` | o rosto do Torado (imagem de referência `assets/Batalha/npc-torado.png`) com chifrinhos de diabo e sorriso convencido, segurando três cartas em leque |
| `icone-outro-jogador.png` | duas mãos, uma de cada lado, segurando cartas uma contra a outra como um duelo, com um raio amarelo no meio |
| `icone-como-jogar.png` | livro de regras aberto com uma carta e uma almôndega em chamas saindo das páginas |

---

## Depois (fase 7): efeitos especiais por ataque
> **Agora tem arquivo próprio: `docs/BATALHA-EFEITOS.md`** (40 imagens com prompts e quadros). A lista
> abaixo foi a primeira ideia.

Não precisa agora. Quando chegar a hora, cada ataque pode ganhar uma **sequência de 4 a 6 quadros**
(PNG transparente, 512×512) que toca por cima do alvo. Candidatos:
- **Macarronada a 300%** (Enzo Games): almôndegas em chamas caindo como meteoros.
- **Vírgula-rangue** (Degustador): vírgulas girando como bumerangue.
- **Bala Dourada** (Inominável): risco dourado atravessando a tela.
- **Glitch** (Bug do Discord): pixels rosa e ciano estourando.
- **Reação 😡** (Emoji Pistola): chuva de emojis bravos.
- **Marretada** (Marreteiro): rachadura no chão com lascas de concreto.
- **Ban de 7 Dias** (Moderador): martelo gigante descendo com carimbo.

Por enquanto o jogo usa efeitos genéricos em CSS (bote, número de dano, tremida, balão com o nome do ataque).
