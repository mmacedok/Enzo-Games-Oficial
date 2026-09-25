# Baralho Enzo — ideias das cartas (primeira coleção, 25 cartas)

> Documento de conteúdo do Baralho. **Fica só no branch local `baralho`, nunca vai para o GitHub** (ver `CLAUDE.md`).
> Fontes: `E:\Henrique V0\Vault V0\Henrique\Enzo Games.md` (bíblia), mapa do Zezo Verso (`assets/zezoverso-header.png` / `mundo-enzo-games.png`) e os sprites da Ronda Noturna (`assets/ronda/`).

## Resumo da coleção

- **3 tipos de carta:**
  - **personagem:** heróis, vilões e aliados com nome;
  - **goon:** capangas e criaturas genéricas da Legião do Mal e da internet;
  - **campo:** lugares do Zezo Verso.
- **25 cartas:** as 7 que já existem no código, que ainda não têm arte de carta (hoje usam recorte da ficha), mais 18 novas.

| Raridade | Qtd | Cartas |
|---|---|---|
| Lendário | 3 | Enzo Games, Cabo Côco, Piscina de Macarronada |
| Épico | 5 | Degustador da Noite, O Inominável, Stand do Joinha, Chorão, Sombra do Degustador |
| Raro | 8 | Hatsune Neves, Superkid, Encantadora, Marreteiro do Coração, Moderador do BAN, Feiticeiro de Terno, Toradolândia, Mansão do Inominável |
| Comum | 9 | ItaloLOL, Cara de Coração, Bug do Discord, Notificação Morcego, Emoji Pistola, Drone Vigia, Estacionamento Noturno, Casa do Enzo Games, São João do Butico |

**Pesos:**
- As chances dos pacotes são por raridade (72/22/5/1 no Estacionamento). Com 9 comuns, cada comum sai bem menos que o ItaloLOL sai hoje. Isso é bom: dá vontade de completar.
- Sugestão: `peso: 2` nos goons comuns e `peso: 1` no resto, para que os lugares e o ItaloLOL fiquem um pouco mais "caçáveis".

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

## As 25 cartas

Formato de cada item:
- **Ref.:** a imagem de referência;
- **Frase:** o texto da faixa da carta;
- **Prompt:** vai depois do bloco de estilo.

### Já existem no código (precisam de arte)

**#001 Enzo Games** — `enzo-games` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/Enzo games ficha.png`
- **Frase:** trocar a atual. "Segunda-feira" está errado no cânone: ele odeia **quarta-feira**. Sugestão: *"Quarta-feira de novo. Pelo menos tem macarronada."*
- **Prompt:** `Enzo Games na Forma Ultimate "Motores de Macarronada a 300%": levitando envolto em filamentos incandescentes de espaguete, uma esfera gigante de macarronada em cada mão, olho esquerdo com uma almôndega em chamas cósmicas no lugar da pupila (estilo Sans), babador de Yu-Gi-Oh!, sorriso sinistro, explosão de molho de tomate em forma de cogumelo atrás.` + lendário.

**#002 Cabo Côco** — `cabo-coco` · personagem · **Lendário** (carta censurada, "Banido")
- **Ref.:** `assets/Personagens/Cabo Côco.png`
- **Frase:** mantém *"Conteúdo banido em 456 países."*
- **Prompt:** `Cabo Côco em pose de ficha de personagem, iluminado por holofote de interrogatório, fitas amarelas de "cena do crime" cruzando o fundo (sem texto legível nelas), selos vermelhos de carimbo espalhados.` + lendário.
- A arte fica borrada no site até a conquista, então pode ser ousada.

**#003 Degustador da Noite** — `degustador-da-noite` · personagem · **Épico**
- **Ref.:** `assets/Personagens/Degustador da noite Ficha.png`
- **Frase:** mantém *"A cidade dorme. A vírgula mal posta, não."*
- **Prompt:** `O Degustador da Noite (fantasia malfeita do Batman, gorro verde do Teemo com óculos, MP5K laranja fluorescente) agachado na beira de um prédio à noite, lua cheia atrás, batarangues em forma de vírgula voando, escudos de parênteses flutuando ao lado.` + épico.

**#004 O Inominável** — `o-inominavel` · personagem · **Épico**
- **Ref.:** `assets/Personagens/O Inominavel Ficha.png`
- **Frase:** mantém *"EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!"*
- **Prompt:** `O Inominável (cabelo comprido, óculos escuros, camiseta do Gorillaz) digitando num laptop brilhante diante de um vitral de catedral, relâmpagos lá fora, sorriso malévolo, rifle sniper encostado na parede com uma bala dourada em primeiro plano.` + épico.

**#005 Hatsune Neves** — `hatsune-neves` · personagem · **Raro**
- **Ref.:** `assets/Personagens/Hatsune Neves Ficha.png`
- **Frase:** mantém.
- **Prompt:** `Hatsune Neves (maria-chiquinha azul, barba cerrada, óculos, smartwatch) sentado no quarto fechado, invocando criaturas de cartas de Magic que saem brilhando de um leque de cartas na mão, barreira translúcida de isolamento cobrindo a porta.` + raro.

**#006 Superkid** — `superkid` · personagem · **Raro**
- **Ref.:** `assets/Personagens/Superkid Ficha.png` (e o Superkid voando no mapa do Zezo Verso)
- **Frase:** mantém.
- **Prompt:** `Superkid (garoto sisudo, bigode proeminente, corpo robusto, capa vermelha) de braços cruzados "farmando aura", aura amarela subindo do corpo, relógio de ponteiro marcando 67 segundos flutuando atrás.` + raro.

**#007 ItaloLOL** — `italolol` · personagem · **Comum**
- **Ref.:** `assets/Personagens/Italolol.png`
- **Frase:** mantém.
- **Prompt:** `ItaloLOL (cão amarelo de orelhas caídas, mechas vermelhas, óculos redondos, unhas pretas) dentro de um carro com vidros embaçados, jogando LoL num laptop, fone na cabeça, latindo furioso para a tela, pelúcia do Ezreal no banco ao lado.` + comum.

### Personagens novos

**#008 Stand do Joinha** — `stand-do-joinha` · personagem · **Épico**
- **Ref.:** quadrinho da Invasão da Cozinha (Capítulo com o Stand)
- **Frase:** *"👍 Positivo. Agora corre."*
- **Prompt:** `Manifestação espiritual estilo Stand de JoJo: homem de terno risca-de-giz, semi-transparente e brilhante, fazendo sinal de positivo com o polegar, raios elétricos saindo do polegar, contorno de energia azul, fundo com linhas de velocidade estilo mangá.` + épico.

**#009 Chorão** — `chorao` · personagem · **Épico**
- **Ref.:** ficha do Chorão (thread `ebf7e41bd727326a`)
- **Frase:** *"Vou te processar! (chorando)"*
- **Prompt:** `Chorão, vilão adulto corpulento de macacão operário, chorando em birra com a boca aberta, cachoeiras de lágrimas inundando um torneio de cartas ao redor, mesas e cartas boiando, pilha de papéis de processo judicial voando.` + épico.
- **Decidir:** a bíblia diz "Chorão (ex-Cabo Coco)". Se o Chorão É o Cabo Côco, esta carta vira a versão "liberada" e o #002 fica como a versão banida, ou a gente troca por outro personagem.

**#010 Sombra do Degustador** — `sombra-do-degustador` · personagem · **Épico**
- **Ref.:** sprite do Degustador sombrio (capa rasgada roxa, chapéu do Teemo, olhos roxos brilhantes)
- **Frase:** *"Quando a derrota no LoL é grande demais, sobra só a sombra."*
- **Prompt:** `Versão sombria do Degustador da Noite: corpo feito de fumaça roxa escura, capa rasgada em farrapos esvoaçando, gorro verde do Teemo com óculos vermelhos, olhos roxos brilhantes, mãos em punho, fumaça roxa se dissolvendo nas bordas, fundo de beco escuro com neon.` + épico.

**#011 Feiticeiro de Terno** — `feiticeiro-de-terno` · personagem · **Raro**
- **Ref.:** sprite do homem de cabelo roxo longo, sobretudo preto e bola de energia magenta
- **Frase:** *"Na Legião do Mal, até a magia usa gravata."*
- **Prompt:** `Homem de cabelo roxo longo esvoaçante, terno preto com gravata roxa e sobretudo de barra rasgada, saltando e disparando uma esfera de energia magenta da mão, raios rosa em espiral em volta, fundo de telhados da cidade à noite.` + raro.
- **Decidir:** quem é ele no cânone? O nome é provisório.

**#012 Encantadora** — `encantadora` · goon · **Raro**
- **Ref.:** `assets/ronda/inimigos/feiticeira-01..04.png`
- **Frase:** *"Um feitiço rosa e você esquece o que ia falar no Discord."*
- **Prompt:** `Feiticeira de cabelo magenta longo e manto roxo escuro com botões dourados, flutuando, chama rosa na palma da mão, faixa de energia rosa girando em volta do corpo, metade do corpo se desfazendo em névoa rosa, fundo de telhado com antenas à noite.` + raro.

**#013 Marreteiro do Coração** — `marreteiro-do-coracao` · goon · **Raro**
- **Ref.:** sprite do brutamontes de bandana vermelha e marreta
- **Frase:** *"Coração no peito, marreta na mão."*
- **Prompt:** `Brutamontes musculoso de barba, bandana vermelha, camiseta branca rasgada com coração vermelho no peito, jeans rasgado e botas, erguendo uma marreta de pedra gigante acima da cabeça com cara de fúria, lascas de concreto voando, fundo de estacionamento à noite.` + raro.

**#014 Moderador do BAN** — `moderador-do-ban` · goon · **Raro**
- **Ref.:** sprite do cavaleiro de armadura escura com escudo azul "MOD" e marreta "BAN"
- **Frase:** *"Você foi silenciado por 7 dias."*
- **Prompt:** `Cavaleiro baixinho de armadura cinza-escura com detalhes dourados e visor amarelo brilhante, escudo azul e martelo preto e dourado, desferindo uma martelada, fundo de servidor de Discord com canais em roxo.` + raro.
- **Exceção:** aqui o texto "MOD" no escudo e "BAN" no martelo é permitido, porque faz parte do personagem.

**#015 Cara de Coração** — `cara-de-coracao` · goon · **Comum**
- **Ref.:** `assets/ronda/inimigos/coracao-01..04.png`
- **Frase:** *"Tem 40 iguais a ele. Todos com o mesmo coração."*
- **Prompt:** `Capanga barbudo e musculoso de camiseta branca com coração vermelho, jeans e botas pretas, andando decidido com punhos cerrados, cara fechada, fundo liso vermelho com retícula.` + comum.

**#016 Bug do Discord** — `bug-do-discord` · goon · **Comum**
- **Ref.:** sprite do besouro roxo com pixels glitch rosa e ciano
- **Frase:** *"Não é bug, é feature da Legião."*
- **Prompt:** `Besouro roxo escuro de olho magenta brilhante, pixels quadrados rosa e ciano saindo do casco como glitch digital, andando de lado, fundo roxo com linhas de interferência de tela.` + comum.

**#017 Notificação Morcego** — `notificacao-morcego` · goon · **Comum**
- **Ref.:** sprite da bola vermelha com "!" e asas de morcego
- **Frase:** *"@everyone às 3 da manhã."*
- **Prompt:** `Bolinha vermelha brilhante com ponto de exclamação branco, asas de morcego cinza-escuras batendo, brilho vermelho pulsando em volta, fundo escuro com várias bolinhas iguais menores ao longe.` + comum.
- **Exceção:** o "!" é parte do desenho.

**#018 Emoji Pistola** — `emoji-pistola` · goon · **Comum**
- **Ref.:** sprites do emoji amarelo bravo (dentes cerrados / gritando)
- **Frase:** *"Reagiu com 😡 em todas as suas mensagens."*
- **Prompt:** `Emoji amarelo redondo com sobrancelhas franzidas, bochechas vermelhas e boca gritando, tremendo de raiva com linhas de fúria em volta, fundo laranja com retícula.` + comum.

**#019 Drone Vigia** — `drone-vigia` · goon · **Comum**
- **Ref.:** `assets/ronda/objetos/drone-01..02.png`
- **Frase:** *"Nenhum estacionamento fica sem câmera por muito tempo."*
- **Prompt:** `Drone preto de quatro hélices com garras embaixo e um olho-lente vermelho brilhante disparando um facho de luz, luz roxa no topo, voando sobre um estacionamento escuro visto de cima.` + comum.

### Campos (cartas de lugar)
Cartas de campo são **paisagem dentro de retrato**: o lugar ocupa o quadro, sem personagem em destaque (no máximo um figurante pequeno). Use o mapa do Zezo Verso como referência de cada lugar. No site, dá para dar a elas uma moldura diferente, por exemplo uma faixa "CAMPO" e borda com textura de mapa.

**#020 Piscina de Macarronada** — `piscina-de-macarronada` · campo · **Lendário**
- **Ref.:** quadrinho do Arco 7 (parede de aço abrindo)
- **Frase:** *"O mundo é muito mais que macarronada. Mas não hoje."*
- **Prompt:** `Piscina olímpica transbordando de macarronada com almôndegas borbulhantes, dezenas de cartas de Yu-Gi-Oh! boiando na superfície, parede de aço aberta dos dois lados, holofotes dourados, vapor subindo.` + lendário.

**#021 Toradolândia** — `toradolandia` · campo · **Raro**
- **Ref.:** mapa do Zezo Verso (caverna roxa) e o quadrinho do Arco 6
- **Frase:** *"BEM-VINDO À TORADOLÂNDIA!"*
- **Prompt:** `Caverna high-tech subterrânea iluminada de roxo: fóssil de T-Rex gigante, moeda monumental de 1 centavo, estátua colossal do Teemo, parede de monitores mostrando telas vermelhas de derrota (sem texto legível), Onix Hatch preto estacionado na rampa.` + raro.

**#022 Mansão do Inominável** — `mansao-do-inominavel` · campo · **Raro**
- **Ref.:** mapa do Zezo Verso (topo do morro com lua) e o Arco 2
- **Frase:** *"Sim, Enzo Games... é ficção..."*
- **Prompt:** `Mansão gótica abandonada no alto de uma colina, janelas de catedral acesas em roxo, tempestade de raios, lua cheia, árvores secas retorcidas, uma única silhueta pequena na janela da torre.` + raro.

**#023 Estacionamento Noturno** — `estacionamento-noturno` · campo · **Comum**
- **Ref.:** Arco 1 (Capítulo 1)
- **Frase:** *"Nossa, que barulhos estranhos são esses?"*
- **Prompt:** `Estacionamento de condomínio à noite sem câmeras, lua cheia entre nuvens, um carro com vidros completamente embaçados balançando no centro, lanterna quebrada no chão, teias de aranha nos postes.` + comum.

**#024 Casa do Enzo Games** — `casa-do-enzo-games` · campo · **Comum**
- **Ref.:** mapa do Zezo Verso (casa amarela de telhado vermelho no deserto)
- **Frase:** *"Sofá, TV, Continental de Yu-Gi-Oh!. Não perturbe."*
- **Prompt:** `Casa amarela de telhado vermelho no meio de um deserto laranja com cactos, pôr do sol, pela janela dá para ver a luz da TV ligada, caixa de correio na frente, crânio de boi na areia.` + comum.

**#025 São João do Butico** — `sao-joao-do-butico` · campo · **Comum**
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

## Para decidir (Henrique)
1. O Chorão é o Cabo Côco? (ver #009)
2. Quem é o Feiticeiro de Terno? (ver #011)
3. Campos precisam de moldura própria no site, ou só a faixa "Campo"?
4. Os pacotes passam a usar as cartas novas na capa? Por exemplo, o Estacionamento com o Estacionamento Noturno na frente.
