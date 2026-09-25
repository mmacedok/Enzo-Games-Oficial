# Baralho Enzo — ideias das cartas (primeira coleção, 24 cartas)

> Documento de conteúdo do Baralho. **Fica só no branch local `baralho`, nunca vai para o GitHub** (ver `CLAUDE.md`).
> Fontes: `E:\Henrique V0\Vault V0\Henrique\Enzo Games.md` (bíblia), mapa do Zezo Verso (`assets/zezoverso-header.png` / `mundo-enzo-games.png`) e os sprites da Ronda Noturna (`assets/ronda/`).

## Resumo da coleção

- **3 tipos de carta:**
  - **personagem:** heróis, vilões e aliados com nome;
  - **goon:** capangas e criaturas genéricas da Legião do Mal e da internet;
  - **campo:** lugares do Zezo Verso.
- **24 cartas** (a tabela abaixo é gerada do `js/baralho-dados.js`, que é quem manda).

| # | Carta | Raridade | Tipo | Frase |
|---|---|---|---|---|
| 001 | Enzo Games | Lendário | Personagem | Finalmente a quarta-feira. |
| 002 | Cabo Côco | Lendário (0,5% fixo) | Personagem | Conteúdo banido em 456 países. |
| 003 | Degustador da Noite | Lendário | Personagem | Vírgulas não lutam contra o crime. Eu luto. |
| 004 | O Inominável | Lendário | Personagem | EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH! |
| 005 | Hatsune Neves | Raro | Personagem | Invoco uma carta de Magic e fecho a porta do quarto. |
| 006 | Superkid | Lendário | Personagem | Quanto mais besteira ao redor, mais aura. |
| 007 | ItaloLOL | Raro | Personagem | Au! Aura! 0/14/2 e a culpa é do jungle. |
| 008 | Stand do Joinha | Raro | Personagem | Num tem eu, num tem 👍 |
| 009 | Chorão | Épico | Personagem | Vou te processar! (chorando) |
| 010 | Sombra do Degustador | Épico | Personagem | Ei, eu vou pegar Teemo no top. |
| 011 | Encantadora | Raro | Capanga | Vem cá, meu gadinho. |
| 012 | Marreteiro do Coração | Raro | Capanga | EU VOU QUEBRAR TUDO POR ELA! |
| 013 | Moderador do BAN | Raro | Capanga | Você foi silenciado por 7 dias. |
| 014 | Cara de Coração | Comum | Capanga | Iludido, mas sempre está lá por ela. |
| 015 | Bug do Discord | Comum | Capanga | Não é bug, é feature da Legião. |
| 016 | Notificação Morcego | Comum | Capanga | @everyone às 3 da manhã. |
| 017 | Emoji Pistola | Comum | Capanga | Reagiu com 😡 em todas as suas mensagens. |
| 018 | Drone Vigia | Comum | Capanga | Nenhum estacionamento fica sem câmera por muito tempo. |
| 019 | Piscina de Macarronada | Lendário | Campo | O que alguém poderia querer além de uma piscina de macarronada? |
| 020 | Toradolândia | Épico | Campo | BEM-VINDO À TORADOLÂNDIA! |
| 021 | Mansão do Inominável | Épico | Campo | Sim, Enzo Games... é ficção... |
| 022 | Estacionamento Noturno | Comum | Campo | Absolutamente nada nunca aconteceu aqui. |
| 023 | Casa do Enzo Games | Comum | Campo | Bem-vindo a Santa Maria. Trouxe macarronada? |
| 024 | São João do Butico | Comum | Campo | Vira à direita na mansão da Playboy. |

**Pesos:**
- As chances dos pacotes são por raridade (72/22/5/1 no Estacionamento); dentro da raridade vale o `peso` (capangas comuns: 2, resto: 1).
- O Cabo Côco fica fora desse sorteio: antes de cada carta há 0,5% de sair ele, em qualquer pacote.

---

## Como gerar a arte de cada carta

### Formato
- **Retrato 4:5**, por exemplo 1024×1280. A janela de arte da carta (`.carta-tcg-arte`, `object-fit: cover`) corta as bordas. Deixe o essencial no **quadrado central** e ajuste com o campo `foco` (object-position).
- **Sem texto nenhum na arte**, nem nome nem balão: a moldura da carta já imprime nome, número, raridade e frase. Onomatopeia só se for parte do desenho, e sempre em português.
- **Fundo cheio:** uma cena ou um fundo de cor com textura de gibi, nunca branco nem transparente. O sprite recortado fica feio na moldura.
- **Arquivo:** `assets/Cartas/<id>.png`. Depois rode o pipeline de imagens web (`lib/web-images.js`) e troque `arte:` em `js/baralho-dados.js`. Reinicie o servidor.

### Bloco de estilo (colar no começo de TODO prompt)
```
Ilustração de carta colecionável estilo tira de jornal vintage (Garfield, Jim Davis), traço à mão com
contorno de nanquim grosso e expressivo, cores quentes e saturadas, textura leve de papel de gibi e
retícula de pontos. Composição vertical 4:5, personagem centralizado ocupando o quadro central, fundo
cheio (nada de branco). SEM NENHUM TEXTO, letra, número ou balão na imagem.
```

### Toque por raridade (acrescentar ao final do prompt)

| Raridade | Acréscimo |
|---|---|
| Comum | fundo simples de uma cor com retícula, pose neutra ou cômica |
| Raro | fundo com cenário leve, pose de ação |
| Épico | iluminação dramática, aura/energia colorida em volta, fundo com partículas (o foil do site brilha por cima) |
| Lendário | pose épica de splash page, raios de luz dourados atrás, fundo cósmico/explosivo, sensação de capa de gibi |

### Referência de personagem
Sempre anexe a imagem de referência indicada em cada carta (a ficha em `assets/Personagens/` ou o sprite em `assets/ronda/`) e diga: *"mantenha exatamente a aparência do personagem da imagem de referência"*. É a mesma técnica das edições canônicas ("DEIXE EXATAMENTE COMO ESTÁ...").

---

## As 24 cartas

Formato de cada item:
- **Ref.:** a imagem de referência;
- **Frase:** o texto da faixa da carta;
- **Prompt:** vai depois do bloco de estilo.

### Já existem no código (precisam de arte)

**#001 Enzo Games** — `enzo-games` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/Enzo games ficha.png`
- **Frase:** *"Finalmente a quarta-feira."*
- **Prompt:** `Enzo Games na Forma Ultimate "Motores de Macarronada a 300%": levitando envolto em filamentos incandescentes de espaguete, uma esfera gigante de macarronada em cada mão, olho esquerdo com uma almôndega em chamas cósmicas no lugar da pupila (estilo Sans), babador de Yu-Gi-Oh!, sorriso sinistro, explosão de molho de tomate em forma de cogumelo atrás.` + lendário.

**#002 Cabo Côco** — `cabo-coco` · personagem · **Lendário** (coberto pela tarja de cena do crime até a senha "copo de lágrimas")
- **Ref.:** `assets/Personagens/Cabo Côco.png`
- **Frase:** *"Conteúdo banido em 456 países."*
- **Prompt:** `Cabo Côco em pose de ficha de personagem, iluminado por holofote de interrogatório, fitas amarelas de "cena do crime" cruzando o fundo (sem texto legível nelas), selos vermelhos de carimbo espalhados.` + lendário.
- A arte fica borrada no site até a conquista, então pode ser ousada.

**#003 Degustador da Noite** — `degustador-da-noite` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/Degustador da noite Ficha.png`
- **Frase:** *"Vírgulas não lutam contra o crime. Eu luto."*
- **Prompt:** `O Degustador da Noite (fantasia malfeita do Batman, gorro verde do Teemo com óculos, MP5K laranja fluorescente) agachado na beira de um prédio à noite, lua cheia atrás, batarangues em forma de vírgula voando, escudos de parênteses flutuando ao lado.` + épico.

**#004 O Inominável** — `o-inominavel` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/O Inominavel Ficha.png`
- **Frase:** *"EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!"*
- **Prompt:** `O Inominável (cabelo comprido, óculos escuros, camiseta do Gorillaz) digitando num laptop brilhante diante de um vitral de catedral, relâmpagos lá fora, sorriso malévolo, rifle sniper encostado na parede com uma bala dourada em primeiro plano.` + épico.

**#005 Hatsune Neves** — `hatsune-neves` · personagem · **Raro**
- **Ref.:** `assets/Personagens/Hatsune Neves Ficha.png`
- **Frase:** *"Invoco uma carta de Magic e fecho a porta do quarto."*
- **Prompt:** `Hatsune Neves (maria-chiquinha azul, barba cerrada, óculos, smartwatch) sentado no quarto fechado, invocando criaturas de cartas de Magic que saem brilhando de um leque de cartas na mão, barreira translúcida de isolamento cobrindo a porta.` + raro.

**#006 Superkid** — `superkid` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/Superkid Ficha.png` (e o Superkid voando no mapa do Zezo Verso)
- **Frase:** *"Quanto mais besteira ao redor, mais aura."*
- **Prompt:** `Superkid (garoto sisudo, bigode proeminente, corpo robusto, capa vermelha) de braços cruzados "farmando aura", aura amarela subindo do corpo, relógio de ponteiro marcando 67 segundos flutuando atrás.` + raro.

**#007 ItaloLOL** — `italolol` · personagem · **Raro**
- **Ref.:** `assets/Personagens/Italolol.png`
- **Frase:** *"Au! Aura! 0/14/2 e a culpa é do jungle."*
- **Prompt:** `ItaloLOL (cão amarelo de orelhas caídas, mechas vermelhas, óculos redondos, unhas pretas) dentro de um carro com vidros embaçados, jogando LoL num laptop, fone na cabeça, latindo furioso para a tela, pelúcia do Ezreal no banco ao lado.` + comum.

### Personagens novos

**#008 Stand do Joinha** — `stand-do-joinha` · personagem · **Raro**
- **Ref.:** quadrinho da Invasão da Cozinha (Capítulo com o Stand)
- **Frase:** *"Num tem eu, num tem 👍"*
- **Prompt:** `Manifestação espiritual estilo Stand de JoJo: homem de terno risca-de-giz, semi-transparente e brilhante, fazendo sinal de positivo com o polegar, raios elétricos saindo do polegar, contorno de energia azul, fundo com linhas de velocidade estilo mangá.` + épico.

**#009 Chorão** — `chorao` · personagem · **Épico**
- **Ref.:** ficha do Chorão (thread `ebf7e41bd727326a`)
- **Frase:** *"Vou te processar! (chorando)"*
- **Prompt:** `Chorão, vilão adulto corpulento de macacão operário, chorando em birra com a boca aberta, cachoeiras de lágrimas inundando um torneio de cartas ao redor, mesas e cartas boiando, pilha de papéis de processo judicial voando.` + épico.
- **Decidido:** Chorão e Cabo Côco são cartas diferentes.

**#010 Sombra do Degustador** — `sombra-do-degustador` · personagem · **Épico**
- **Ref.:** sprite do Degustador sombrio (capa rasgada roxa, chapéu do Teemo, olhos roxos brilhantes)
- **Frase:** *"Ei, eu vou pegar Teemo no top."*
- **Prompt:** `Versão sombria do Degustador da Noite: corpo feito de fumaça roxa escura, capa rasgada em farrapos esvoaçando, gorro verde do Teemo com óculos vermelhos, olhos roxos brilhantes, mãos em punho, fumaça roxa se dissolvendo nas bordas, fundo de beco escuro com neon.` + épico.


**#011 Encantadora** — `encantadora` · goon · **Raro**
- **Ref.:** `assets/ronda/inimigos/feiticeira-01..04.png`
- **Frase:** *"Vem cá, meu gadinho."*
- **Prompt:** `Feiticeira de cabelo magenta longo e manto roxo escuro com botões dourados, flutuando, chama rosa na palma da mão, faixa de energia rosa girando em volta do corpo, metade do corpo se desfazendo em névoa rosa, fundo de telhado com antenas à noite.` + raro.

**#012 Marreteiro do Coração** — `marreteiro-do-coracao` · goon · **Raro**
- **Ref.:** sprite do brutamontes de bandana vermelha e marreta
- **Frase:** *"EU VOU QUEBRAR TUDO POR ELA!"*
- **Prompt:** `Brutamontes musculoso de barba, bandana vermelha, camiseta branca rasgada com coração vermelho no peito, jeans rasgado e botas, erguendo uma marreta de pedra gigante acima da cabeça com cara de fúria, lascas de concreto voando, fundo de estacionamento à noite.` + raro.

**#013 Moderador do BAN** — `moderador-do-ban` · goon · **Raro**
- **Ref.:** sprite do cavaleiro de armadura escura com escudo azul "MOD" e marreta "BAN"
- **Frase:** *"Você foi silenciado por 7 dias."*
- **Prompt:** `Cavaleiro baixinho de armadura cinza-escura com detalhes dourados e visor amarelo brilhante, escudo azul e martelo preto e dourado, desferindo uma martelada, fundo de servidor de Discord com canais em roxo.` + raro.
- **Exceção:** aqui o texto "MOD" no escudo e "BAN" no martelo é permitido, porque faz parte do personagem.

**#014 Cara de Coração** — `cara-de-coracao` · goon · **Comum**
- **Ref.:** `assets/ronda/inimigos/coracao-01..04.png`
- **Frase:** *"Iludido, mas sempre está lá por ela."*
- **Prompt:** `Capanga barbudo e musculoso de camiseta branca com coração vermelho, jeans e botas pretas, andando decidido com punhos cerrados, cara fechada, fundo liso vermelho com retícula.` + comum.

**#015 Bug do Discord** — `bug-do-discord` · goon · **Comum**
- **Ref.:** sprite do besouro roxo com pixels glitch rosa e ciano
- **Frase:** *"Não é bug, é feature da Legião."*
- **Prompt:** `Besouro roxo escuro de olho magenta brilhante, pixels quadrados rosa e ciano saindo do casco como glitch digital, andando de lado, fundo roxo com linhas de interferência de tela.` + comum.

**#016 Notificação Morcego** — `notificacao-morcego` · goon · **Comum**
- **Ref.:** sprite da bola vermelha com "!" e asas de morcego
- **Frase:** *"@everyone às 3 da manhã."*
- **Prompt:** `Bolinha vermelha brilhante com ponto de exclamação branco, asas de morcego cinza-escuras batendo, brilho vermelho pulsando em volta, fundo escuro com várias bolinhas iguais menores ao longe.` + comum.
- **Exceção:** o "!" é parte do desenho.

**#017 Emoji Pistola** — `emoji-pistola` · goon · **Comum**
- **Ref.:** sprites do emoji amarelo bravo (dentes cerrados / gritando)
- **Frase:** *"Reagiu com 😡 em todas as suas mensagens."*
- **Prompt:** `Emoji amarelo redondo com sobrancelhas franzidas, bochechas vermelhas e boca gritando, tremendo de raiva com linhas de fúria em volta, fundo laranja com retícula.` + comum.

**#018 Drone Vigia** — `drone-vigia` · goon · **Comum**
- **Ref.:** `assets/ronda/objetos/drone-01..02.png`
- **Frase:** *"Nenhum estacionamento fica sem câmera por muito tempo."*
- **Prompt:** `Drone preto de quatro hélices com garras embaixo e um olho-lente vermelho brilhante disparando um facho de luz, luz roxa no topo, voando sobre um estacionamento escuro visto de cima.` + comum.

### Campos (cartas de lugar)
Cartas de campo são **paisagem dentro de retrato**: o lugar ocupa o quadro, sem personagem em destaque (no máximo um figurante pequeno). Use o mapa do Zezo Verso como referência de cada lugar. No site, dá para dar a elas uma moldura diferente, por exemplo uma faixa "CAMPO" e borda com textura de mapa.

**#019 Piscina de Macarronada** — `piscina-de-macarronada` · campo · **Lendário**
- **Ref.:** quadrinho do Arco 7 (parede de aço abrindo)
- **Frase:** *"O que alguém poderia querer além de uma piscina de macarronada?"*
- **Prompt:** `Piscina olímpica transbordando de macarronada com almôndegas borbulhantes, dezenas de cartas de Yu-Gi-Oh! boiando na superfície, parede de aço aberta dos dois lados, holofotes dourados, vapor subindo.` + lendário.

**#020 Toradolândia** — `toradolandia` · campo · **Épico**
- **Ref.:** mapa do Zezo Verso (caverna roxa) e o quadrinho do Arco 6
- **Frase:** *"BEM-VINDO À TORADOLÂNDIA!"*
- **Prompt:** `Caverna high-tech subterrânea iluminada de roxo: fóssil de T-Rex gigante, moeda monumental de 1 centavo, estátua colossal do Teemo, parede de monitores mostrando telas vermelhas de derrota (sem texto legível), Onix Hatch preto estacionado na rampa.` + raro.

**#021 Mansão do Inominável** — `mansao-do-inominavel` · campo · **Épico**
- **Ref.:** mapa do Zezo Verso (topo do morro com lua) e o Arco 2
- **Frase:** *"Sim, Enzo Games... é ficção..."*
- **Prompt:** `Mansão gótica abandonada no alto de uma colina, janelas de catedral acesas em roxo, tempestade de raios, lua cheia, árvores secas retorcidas, uma única silhueta pequena na janela da torre.` + raro.

**#022 Estacionamento Noturno** — `estacionamento-noturno` · campo · **Comum**
- **Ref.:** Arco 1 (Capítulo 1)
- **Frase:** *"Absolutamente nada nunca aconteceu aqui."*
- **Prompt:** `Estacionamento de condomínio à noite sem câmeras, lua cheia entre nuvens, um carro com vidros completamente embaçados balançando no centro, lanterna quebrada no chão, teias de aranha nos postes.` + comum.

**#023 Casa do Enzo Games** — `casa-do-enzo-games` · campo · **Comum**
- **Ref.:** mapa do Zezo Verso (casa amarela de telhado vermelho no deserto)
- **Frase:** *"Bem-vindo a Santa Maria. Trouxe macarronada?"*
- **Prompt:** `Casa amarela de telhado vermelho no meio de um deserto laranja com cactos, pôr do sol, pela janela dá para ver a luz da TV ligada, caixa de correio na frente, crânio de boi na areia.` + comum.

**#024 São João do Butico** — `sao-joao-do-butico` · campo · **Comum**
- **Ref.:** mapa do Zezo Verso (morro de casinhas coloridas)
- **Frase:** *"Vira à direita na mansão da Playboy."*
- **Prompt:** `Morro de favela com casinhas coloridas empilhadas, palmeiras, igrejinha no topo, estrada de terra subindo, um barraco com comporta secreta semiaberta no chão deixando escapar luz roxa.` + comum.

---

## Reserva (próxima leva, fora das 25)
- **Otis Mercy** (épico, variante do ItaloLOL: armadura, asas e auréola da Mercy).
- **Agente do Helicóptero** (raro: careca de barba, macacão de couro, rádio em forma de controle).
- **Bairro das Mansões** e **Operator Village** (campos do mapa).
- **Epic Handshake** (lendário especial: Enzo e o Degustador no aperto de braços).
- **Bala "Blasfêmia"** (carta de item?).
- **Enzo Sherlock** (variante comum do Enzo).

## Decisões do Henrique (2026-09-25)
1. Chorão e Cabo Côco são cartas diferentes.
2. O Feiticeiro de Terno saiu da coleção (sem carta, sem arte).
3. Campos têm moldura própria (feita: papel de mapa, placa de madeira com pregos, janela com rosa dos ventos; classe `.carta-tcg--campo`).
4. Capas dos pacotes com as cartas novas: Estacionamento (Cara de Coração, Estacionamento Noturno, Drone Vigia), Toradolândia (Stand do Joinha, Toradolândia, Sombra do Degustador), Piscina (Degustador, Piscina de Macarronada, Enzo Games).
5. Cabo Côco: lendário com chance fixa de 0,5% por carta (`chanceFixa`), sempre coberto pela tarja de cena do crime até a senha "copo de lágrimas".
