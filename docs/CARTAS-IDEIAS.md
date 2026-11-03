# Baralho Enzo — ideias das cartas (coleção expandida, 42 cartas)

> Documento de conteúdo do Baralho e guia oficial de prompts de arte das cartas.
> Fontes: `Enzo Games art bible` (`Documentacao/Personagens/`), `E:\Henrique V0\Vault V0\Henrique\Enzo Games.md` (bíblia), mapa do Zezo Verso (`assets/zezoverso-header.png` / `mundo-enzo-games.png`) e os sprites da Ronda Noturna (`assets/ronda/`).

## Resumo da coleção

- **4 tipos de carta:**
  - **personagem:** heróis, vilões e aliados com nome;
  - **goon:** capangas, entidades e criaturas genéricas da Legião do Mal e da internet;
  - **campo:** lugares do Zezo Verso;
  - **resenha:** magias e cartas anexadas na horizontal aos personagens.
- **42 cartas** (a tabela abaixo é gerada do `js/baralho-dados.js`, que é quem manda).

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
| 009 | Chorão | Raro | Personagem | Vou te processar! (chorando) |
| 010 | Sombra do Degustador | Épico | Personagem | Ei, eu vou pegar Teemo no top. |
| 011 | Encantadora | Raro | Capanga | Vem cá, meu gadinho. |
| 012 | Marreteiro do Coração | Raro | Capanga | EU VOU QUEBRAR TUDO POR ELA! |
| 013 | Moderador do Discord (era Moderador do BAN) | Raro | Capanga | Você foi silenciado por 7 dias. |
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
| 025 | Calibra o Smite | Raro | Resenha (Magia) | 600 no cravado. |
| 026 | Calibra o Smite (Anuah) | Épico | Resenha (Magia) | Dá smite pra diminuir o dano! |
| 027 | Cadê meu Jungle | Raro | Resenha (Magia) | O cara tá fazendo grompe enquanto eu levo dive. |
| 028 | Dar FF | Comum | Resenha (Magia) | /ff aos 15. |
| 029 | Hoje é Quarta-feira | Raro | Resenha (Magia) | Dia oficial de comer macarronada. |
| 030 | Itallo de Viego 20/0 | Épico | Resenha | Possessão soberana na quarta-feira. |
| 031 | Eu vou ir aí na Pedra Mole te matar | Raro | Resenha | Manda a localização. |
| 032 | Hanna | Raro | Personagem | Essa aura agora é do Superkid. |
| 033 | Mariana | Épico | Personagem | Ninguém encosta nele enquanto eu estiver aqui. |
| 034 | Júlia | Lendário | Personagem | Me dá uma skin, Superkid? |
| 035 | Lavras MG | Raro | Capanga (Entidade) | Interior de Minas Gerais. |
| 036 | Clubexx... | Raro | Campo | O clube secreto da distribuição de aura. |
| 037 | Douglas | Raro | Personagem | Só piso aqui se for no São João do Butico. |
| 038 | Caiam | Raro | Personagem | O Butico está fechado para reformas. |
| 039 | Teemo | Lendário | Personagem | Capitão Teemo no dever. |
| 040 | Tiago Cássio | Épico | Personagem | Empresta essa aura aí rapidão. |
| 041 | PMLDM | Lendário | Personagem | 40/0/100 de Ezreal. |
| 042 | Pidão do Vape | Comum | Capanga | Deixa eu dar só um puxãozinho? |

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
Sempre anexe a imagem de referência indicada em cada carta (a ficha em `assets/Personagens/`, na `Enzo Games art bible` em `Documentacao/Personagens/`, ou o sprite em `assets/ronda/`) e diga: *"mantenha exatamente a aparência do personagem da imagem de referência"*. É a mesma técnica das edições canônicas ("DEIXE EXATAMENTE COMO ESTÁ...").

---

## As 24 cartas originais (#001 a #024)

Formato de cada item:
- **Ref.:** a imagem de referência;
- **Frase:** o texto da faixa da carta;
- **Prompt:** vai depois do bloco de estilo.

### Já existem no código

**#001 Enzo Games** — `enzo-games` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/Enzo games ficha.png` (`Documentacao/Personagens/ENZO-01_Enzo_Games_Principal/`)
- **Frase:** *"Finalmente a quarta-feira."*
- **Prompt:** `Enzo Games na Forma Ultimate "Motores de Macarronada a 300%": levitando envolto em filamentos incandescentes de espaguete, uma esfera gigante de macarronada em cada mão, olho esquerdo com uma almôndega em chamas cósmicas no lugar da pupila (estilo Sans), babador de Yu-Gi-Oh!, sorriso sinistro, explosão de molho de tomate em forma de cogumelo atrás.` + lendário.

**#002 Cabo Côco** — `cabo-coco` · personagem · **Lendário** (coberto pela tarja de cena do crime até a senha "copo de lágrimas")
- **Ref.:** `assets/Personagens/Cabo Côco.png`
- **Frase:** *"Conteúdo banido em 456 países."*
- **Prompt:** `Cabo Côco em pose de ficha de personagem, iluminado por holofote de interrogatório, fitas amarelas de "cena do crime" cruzando o fundo (sem texto legível nelas), selos vermelhos de carimbo espalhados.` + lendário.
- A arte fica borrada no site até a conquista, então pode ser ousada.

**#003 Degustador da Noite** — `degustador-da-noite` · personagem · **Lendário**
- **Ref.:** `assets/Personagens/Degustador da noite Ficha.png` (`Documentacao/Personagens/DEGUSTADOR-01_Degustador_Da_Noite_Padrao/`)
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
- **Ref.:** `assets/Personagens/Superkid Ficha.png` (`Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/`)
- **Frase:** *"Quanto mais besteira ao redor, mais aura."*
- **Prompt:** `Superkid (garoto sisudo, bigode proeminente, corpo robusto, capa vermelha) de braços cruzados "farmando aura", aura amarela subindo do corpo, relógio de ponteiro marcando 67 segundos flutuando atrás.` + raro.

**#007 ItaloLOL** — `italolol` · personagem · **Raro**
- **Ref.:** `assets/Personagens/Italolol.png` (`Documentacao/Personagens/ITALOLOL-01_ItaloLOL_Principal/`)
- **Frase:** *"Au! Aura! 0/14/2 e a culpa é do jungle."*
- **Prompt:** `ItaloLOL (cão amarelo de orelhas caídas, mechas vermelhas, óculos redondos, unhas pretas) dentro de um carro com vidros embaçados, jogando LoL num laptop, fone na cabeça, latindo furioso para a tela, pelúcia do Ezreal no banco ao lado.` + comum.

### Personagens #008 a #018

**#008 Stand do Joinha** — `stand-do-joinha` · personagem · **Raro**
- **Ref.:** quadrinho da Invasão da Cozinha (Capítulo com o Stand)
- **Frase:** *"Num tem eu, num tem 👍"*
- **Prompt:** `Manifestação espiritual estilo Stand de JoJo: homem de terno risca-de-giz, semi-transparente e brilhante, fazendo sinal de positivo com o polegar, raios elétricos saindo do polegar, contorno de energia azul, fundo com linhas de velocidade estilo mangá.` + épico.

**#009 Chorão** — `chorao` · personagem · **Raro**
- **Ref.:** ficha do Chorão (`Documentacao/Personagens/CHORAO-01_Chorao_Principal/`)
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

**#013 Moderador do Discord** (antes Moderador do BAN) — `moderador-do-ban` · goon · **Raro**
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

### Campos #019 a #024 (cartas de lugar)
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

## Novas Cartas (#025 a #042 + forma Ezreal) — Descrições Visuais e Prompts

As descrições abaixo combinam as fichas oficiais da **`Enzo Games art bible`** (`Documentacao/Personagens/`) com as diretrizes visuais definidas pelo Enzo para os personagens inéditos.

### Magias e Resenhas (#025 a #031)

**#025 Calibra o Smite** — `calibra-o-smite` · resenha (magia) · **Raro**
- **Ref.:** Ícone clássico de feitiço *Smite* (Golpear) de League of Legends adaptado ao traço do Zezo Verso.
- **Descrição visual:** Um raio celestial dourado-alaranjado colossal caindo verticalmente do céu sobre um monstro da selva atordoado cuja barra de vida está cravada exatamente na última faísca vermelha, pulverizando-o instantaneamente sem espalhar estilhaços além do círculo do golpe.
- **Frase:** *"600 no cravado."*
- **Prompt:** `Feitiço de raio divino dourado e laranja caindo verticalmente do céu em formato de mão elétrica gigante sobre uma criatura sombria atordoada no centro de um covil de pedra na selva, ondas de choque circulares precisas no chão, faíscas elétricas quentes.` + raro.

**#026 Calibra o Smite (Anuah)** — `calibra-o-smite-anuah` · resenha (magia) · **Épico**
- **Ref.:** Variante azul/roxa de *Smite* Desafiador/Congelante de League of Legends + orbes de Aura do TCG.
- **Descrição visual:** Dois orbes de Aura dourada dos aliados sendo canalizados e disparados como um raio azul-cobalto e roxo sobre o lutador inimigo, envolvendo-o em correntes espectrais de exaustão que encolhem sua silhueta e cortam sua força de ataque pela metade.
- **Frase:** *"Dá smite pra diminuir o dano!"*
- **Prompt:** `Raio místico azul-cobalto e violeta caindo do alto enquanto absorve duas esferas de luz dourada nos cantos inferiores, atingindo um lutador sombrio no centro e prendendo seus braços com correntes translúcidas de gelo e energia azul que drenam sua força, névoa fria ao redor.` + épico.

**#027 Cadê meu Jungle** — `cade-meu-jungle` · resenha (magia) · **Raro**
- **Ref.:** `assets/Personagens/Italolol.png` (`Documentacao/Personagens/ITALOLOL-01_ItaloLOL_Principal/`) + pings amarelos de interrogação (`?`) de League of Legends.
- **Descrição visual:** Cena cômica na selva/rio: um sapo gigante ranzinza (estilo Grompe) sentado num tronco enquanto uma mão fantasmagórica gigante puxa um personagem do banco adversário pela gola de volta para fora da arena, cercado por dezenas de pontos de interrogação amarelos brilhantes flutuando no ar.
- **Frase:** *"O cara tá fazendo grompe enquanto eu levo dive."*
- **Prompt:** `Cena cômica em uma clareira de selva com rio ao fundo: um sapo verde gigante e mal-humorado mastigando um graveto num canto enquanto um redemoinho de vento puxa um lutador assustado pelo colarinho para fora do quadro, vários sinais de interrogação amarelos luminosos flutuando ao redor.` + raro.
- **Exceção:** os pontos de interrogação `?` amarelos de ping fazem parte do desenho.

**#028 Dar FF** — `dar-ff` · resenha (magia) · **Comum**
- **Ref.:** Placa de rendição de MOBA + bandeira branca e botão de autodestruição.
- **Descrição visual:** Um lutador enfaixado tomando um energético/curativo enquanto segura uma bandeirinha branca de trégua com uma mão e aperta um botão vermelho gigante numa caixa de votação com 4 luzes verdes e 1 vermelha; ao fundo, duas caixas idênticas entram em curto-circuito soltando faíscas explosivas para os dois lados.
- **Frase:** *"/ff aos 15."*
- **Prompt:** `Painel de madeira e metal de desenho animado no centro com quatro luzes quadradas verdes acesas e uma vermelha, uma mão enfaixada com curativos brilhantes de cura apertando um botão vermelho gigante enquanto a outra abana uma bandeirinha branca, faíscas elétricas e dinamite prestes a explodir dos dois lados.` + comum.

**#029 Hoje é Quarta-feira** — `hoje-e-quarta-feira` · resenha (magia) · **Raro**
- **Ref.:** `Documentacao/Personagens/ENZO-01_Enzo_Games_Principal/` (Enzo Games: gato laranja baixo e balofo, listras pretas, focinho creme, barba e bigode pretos curtos, tatuagem Maori e smartwatch preto no mesmo braço) + `assets/Cartas/piscina-de-macarronada.png`.
- **Descrição visual:** Enzo Games (gato laranja antropomórfico baixo e gorducho, olhos semicerrados de felicidade, tatuagem Maori e smartwatch preto no braço) jogando duas cartas para trás por cima do ombro enquanto mergulha de garfo e babador numa travessa fumegante de macarronada com almôndegas numa quarta-feira, enquanto outro aliado pula da cadeira do banco para assumir o posto de batalha.
- **Frase:** *"Dia oficial de comer macarronada."*
- **Prompt:** `Gato laranja antropomórfico baixo e balofo com listras pretas, barba e bigode pretos curtos, tatuagem tribal preta e smartwatch no mesmo braço, jogando duas cartas para trás sem olhar enquanto devora feliz uma travessa gigante de espaguete com almôndegas e molho vermelho fumegante em uma mesa de jantar iluminada.` + raro.

**#030 Itallo de Viego 20/0** — `itallo-de-viego` · resenha · **Épico**
- **Ref.:** `Documentacao/Personagens/ITALOLOL-01_ItaloLOL_Principal/` (cãozinho amarelo `< 1m`, óculos redondos finos, orelhas marrons compridas caídas, topete cacheado metade preto e metade rosa-magenta, corrente dourada no pescoço, unhas pretas) + visual de Viego (O Rei Destruído de League of Legends) + `Documentacao/Personagens/ENZO-01_Enzo_Games_Principal/` ao fundo.
- **Descrição visual:** ItaloLOL caracterizado como Viego (O Rei Destruído): vestindo a jaqueta curta aberta de couro preto com detalhes prateados, o coração partido brilhando em verde-espectral no peito, a coroa espectral verde-água flutuando acima de seu topete preto e rosa, empunhando a espada Zweihander espectral verde gigante. Da Névoa Negra ao seu redor surge a silhueta invocada do Enzo Games deitado/virado.
- **Frase:** *"Possessão soberana na quarta-feira."*
- **Prompt:** `Cãozinho amarelo antropomórfico baixinho de orelhas marrons caídas, óculos redondos finos, topete cacheado metade preto e metade rosa-magenta e corrente dourada no pescoço, vestido como um rei espectral sombrio: jaqueta preta aberta, coroa flutuante de luz verde-água acima da cabeça, segurando uma espada longa espectral brilhante verde-esmeralda, rodeado por névoa negra e verde de onde emerge um gato laranja adormecido.` + épico.

**#031 Eu vou ir aí na Pedra Mole te matar** — `pedra-mole` · resenha · **Raro**
- **Ref.:** `Documentacao/Personagens/ENZO-01_Enzo_Games_Principal/` (Enzo Games) + `Documentacao/Personagens/ITALOLOL-01_ItaloLOL_Principal/` (ItaloLOL).
- **Descrição visual (definida pelo Enzo):** Nessa arte, o **Enzo Games está tentando esganar o ItaloLOL** em plena rua da Pedra Mole. Enzo Games (gato laranja baixo e balofo, veias saltando na testa, dentes cerrados em fúria cômica, tatuagem Maori e smartwatch preto visíveis nos braços) está sacudindo e apertando o pescoço do ItaloLOL (cãozinho amarelo pequeno de orelhas marrons caídas, topete preto e rosa bagunçado, óculos redondos tortos no rosto, olhos esbugalhados e língua de fora em desespero cômico).
- **Frase:** *"Manda a localização."*
- **Prompt:** `Cena cômica de briga estilo tira de jornal em uma rua de bairro ensolarada com pedras e muros simples: o gato laranja antropomórfico baixo e gorducho de barba curta preta, tatuagem tribal no braço e smartwatch preto está furioso, avançando e apertando com as duas mãos o pescoço do cãozinho amarelo pequeno de orelhas marrons caídas, topete preto e rosa e óculos redondos tortos, que está com os olhos arregalados e a língua para fora sendo chacoalhado.` + raro.

---

### Arquétipo do Superkid (#032 a #036)

**#032 Hanna** — `hanna` · personagem · **Raro**
- **Ref.:** Personagem inédita + `Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/` (orbe de Aura dourada do Superkid).
- **Descrição visual (definida pelo Enzo):** **Uma jornalista morena extremamente gananciosa.** Mulher jovem de pele morena, cabelo castanho-escuro comprido e bem alinhado, vestindo blazer de repórter elegante com crachá de imprensa pendurado, expressão extremamente gananciosa, ardilosa e fascinada por lucro/poder (sorriso ambicioso de canto de boca, olhos brilhando fixos na energia dourada). Com uma mão ela aponta um microfone de reportagem para frente e com a outra puxa avidamente uma esfera brilhante de Aura dourada do oponente para canalizá-la em direção ao emblema do Superkid.
- **Frase:** *"Essa aura agora é do Superkid."*
- **Prompt:** `Mulher jornalista morena de cabelos castanho-escuros longos, vestindo blazer de repórter e crachá de imprensa no pescoço, com expressão facial extremamente gananciosa, sorriso ardiloso e olhos brilhando de cobiça, segurando um microfone de televisão em uma mão e puxando com unhas afiadas na outra mão uma esfera reluzente de energia dourada, flashes de câmeras ao fundo.` + raro.

**#033 Mariana** — `mariana` · personagem · **Épico**
- **Ref.:** `assets/ronda/inimigos/feiticeira-01..04.png` (carta `#011 Encantadora`) + `Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/`.
- **Descrição visual (definida pelo Enzo):** **Inspirada na Encantadora, só que morena do cabelo cacheado e maligna no sentido de iludir.** Feiticeira/manipuladora de pele morena, cabelos cacheados volumosos castanho-escuros com reflexos místicos, vestindo um traje/manto escuro elegante com detalhes dourados e vinho, olhar sedutor, calculista e maligno de quem ilude e hipnotiza suas vítimas. Em suas mãos flutuam corações de névoa rosa-escura e fios de ilusão que formam uma redoma mágica impenetrável ao redor da silhueta do Superkid ao fundo.
- **Frase:** *"Ninguém encosta nele enquanto eu estiver aqui."*
- **Prompt:** `Feiticeira morena de cabelos cacheados volumosos escuros, expressão maligna, sedutora e manipuladora com sorriso enganador e olhar hipnótico, vestindo manto escuro com adornos dourados, conjurando nas mãos fios de névoa rosa-púrpura e corações sombrios de ilusão que formam um escudo místico brilhante ao redor do quadro.` + épico.

**#034 Júlia** — `julia` · personagem · **Lendário**
- **Ref.:** `Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/` (`SuperKid_Padrao_Ref_01.png` — uniforme azul com frisos dourados, capa vermelha, botas vermelhas e insígnia vermelha e dourada no peito).
- **Descrição visual (definida pelo Enzo):** **Inspirada no visual do Superkid, mas com um cabelo rosa curto.** Jovem heroína vestindo uma versão adaptada do traje clássico do Superkid (túnica azul-royal de mangas curtas com frisos dourados nas bordas, capa vermelha esvoaçante presa aos ombros, cinto vermelho com fivela oval dourada e botas vermelhas), porém com **cabelo rosa curto** estilizado e expressão confiante/pidona, estendendo uma mão brilhando com energia de skin/cosmético dourado enquanto abre um portal luminoso para a cidade de Lavras MG ao fundo.
- **Frase:** *"Me dá uma skin, Superkid?"*
- **Prompt:** `Garota super-heroína de cabelo rosa curto e bagunçado, vestindo uniforme inspirado no Superkid: túnica azul-royal com bordas douradas, capa vermelha esvoaçante nos ombros, cinto vermelho com fivela dourada e botas vermelhas, flutuando em pose heroica enquanto dispara um feixe de energia dourada e abre um portal brilhante mostrando uma metrópole reluzente ao fundo.` + lendário.

**#035 Lavras MG** — `lavras-mg` · goon (entidade) · **Raro**
- **Ref.:** Estética de Metrópolis (quadrinhos clássicos do Superman) + `Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/`.
- **Descrição visual (definida pelo Enzo):** **Cidade inspirada em Metrópolis.** Uma versão grandiosa, futurista e heroica de Lavras-MG retratada exatamente como a Metrópolis do Superman: arranha-céus art déco monumentais e reluzentes sob um céu dourado, um edifício central imponente com um grande globo dourado no topo (ao estilo Planeta Diário), pontes suspensas, um trem mineiro estilizado cruzando os trilhos elevados e feixes de Aura amarela subindo das avenidas para o céu, onde a pequena silhueta do Superkid flutua de braços cruzados.
- **Frase:** *"Interior de Minas Gerais."*
- **Prompt:** `Cidade monumental inspirada na Metrópolis dos quadrinhos clássicos de super-heróis vista em ângulo épico de baixo para cima: arranha-céus art déco reluzentes em tons de ouro e azul, um arranha-céu central coroado por uma grande esfera dourada, trilhos elevados com uma locomotiva moderna, raios de sol e colunas de energia amarela subindo das ruas para o céu.` + raro.

**#036 Clubexx...** — `clubexx` · campo · **Raro**
- **Ref.:** `Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/` (pose de braços cruzados farmando aura) + estética de campo do Zezo Verso.
- **Descrição visual (definida pelo Enzo):** **Uma definição de local para farmar aura.** Um clube/lounge noturno ostentoso e cinematográfico projetado exclusivamente para "farmar aura": entrada com tapete vermelho, colunas de luz neon azul e dourada, fumaça dramática no chão, espelhos gigantes, ventiladores de vento épico para fazer capas esvoaçarem e pedestais iluminados por holofotes onde silhuetas ficam paradas de braços cruzados emanando ondas intensas de Aura dourada.
- **Frase:** *"O clube secreto da distribuição de aura."*
- **Prompt:** `Interior de um clube noturno de luxo e arena de ostentação projetado para "farmar aura": pista espelhada iluminada por holofotes dourados e luzes neon azuis e roxas, máquinas de fumaça dramática no chão, ventiladores grandes nas laterais e pedestais circulares iluminados de onde sobem colunas brilhantes de energia dourada e partículas de luz.` + raro.

---

### Arquétipo São João do Butico / Degustador da Noite (#037 a #039)

**#037 Douglas** — `douglas` · personagem · **Raro**
- **Ref.:** `Documentacao/Personagens/DOUGXBOX-01_DougXbox_Executivo_Padrao/` e `DOUGXBOX-02_DougXbox_Batalha_Tropa_Box/` (ficha canônica do DougXbox na `Enzo Games art bible`) + `assets/Cartas/sao-joao-do-butico.png`.
- **Descrição visual (da Art Bible):** Jovem adulto humano de pele morena clara (pardo quente), rosto anguloso sem barba nem bigode, sobrancelhas pretas grossas e expressivas, cabelo preto curto espetado no topo com franja caída em diagonal na testa. Veste o uniforme tático da Tropa Box (colete verde-escuro de gola alta sobre traje preto com emblemas circulares brancos em X no peito e ombros, braçadeiras brancas nos antebraços) segurando seu controle preto de videogame alimentado por duas pilhas AA brilhando em energia verde, diante das casinhas coloridas de São João do Butico, enquanto um Escudo de Parênteses translúcido brilha ao seu lado.
- **Frase:** *"Só piso aqui se for no São João do Butico."*
- **Prompt:** `Jovem adulto de pele morena clara, rosto anguloso sem barba, sobrancelhas pretas grossas e cabelo preto curto espetado com franja diagonal, vestindo colete tático verde-escuro de gola alta sobre roupa preta e protetores de antebraço brancos, segurando um controle de videogame preto que dispara raios verdes com duas pilhas alcalinas flutuando ao lado, morro com casinhas coloridas de favela ao fundo.` + raro.

**#038 Caiam** — `caiam` · personagem · **Raro**
- **Ref.:** Personagem inédito descrito pelo Enzo + cenário de `assets/Cartas/sao-joao-do-butico.png`.
- **Descrição visual (definida pelo Enzo):** **Um amigo de óculos, cabelo curto e branco, com uma camisa vermelha com uma estrela branca no centro, gritando e zangado.** Jovem adulto usando óculos de grau de armação escura, cabelo curto todo branco/platinado, vestindo uma camiseta vermelha viva com uma grande estrela branca de cinco pontas estampada bem no centro do peito. Está com expressão extremamente zangada e furiosa, boca escancarada gritando a plenos pulmões, veias saltando na testa e punhos cerrados, plantado diante da entrada de São João do Butico impedindo qualquer um de trocar ou invadir o campo.
- **Frase:** *"O Butico está fechado para reformas."*
- **Prompt:** `Jovem de cabelo curto branco platinado e óculos de grau, vestindo uma camiseta vermelha vibrante com uma grande estrela branca de cinco pontas no centro do peito, gritando muito zangado e furioso com a boca aberta, sobrancelhas franzidas, veias de raiva na testa e punhos cerrados, barrando a passagem na entrada de um morro com casinhas coloridas ao fundo.` + raro.

**#039 Teemo** — `teemo` · personagem · **Lendário**
- **Ref.:** `Documentacao/Personagens/DEGUSTADOR-01_Degustador_Da_Noite_Padrao/` (o icônico gorro verde de escoteiro com óculos vermelhos/marrons na testa e tufo verde) + personagem Teemo de League of Legends adaptado ao estilo de gibi do Zezo Verso.
- **Descrição visual:** Pequeno texugo/yordle explorador peludo e baixinho usando o mesmo chapéu verde de escoteiro com óculos de lente vermelha na testa e lenço vermelho no pescoço que inspirou o Degustador da Noite. Está com um sorriso travesso de olhos fechados, segurando uma zarabatana de bambu fumegante com dardos roxos venenosos, cercado por dezenas de cogumelos roxos e verdes brilhantes espalhados pelas vielas de São João do Butico explodindo em nuvens de gás tóxico violeta.
- **Frase:** *"Capitão Teemo no dever."*
- **Prompt:** `Criatura pequena e peluda estilo texugo escoteiro baixinho, usando gorro verde de aviador com óculos de lentes vermelhas na testa, lenço vermelho no pescoço e mochila de explorador, dando um sorriso travesso de olhos fechados enquanto sopra uma zarabatana de bambu, cercado por cogumelos pintados de roxo e verde que explodem em nuvens de fumaça venenosa violeta em um beco noturno.` + lendário.

---

### Cartas Avulsas e Personagens (#040 a #042 + forma Ezreal)

**#040 Tiago Cássio** — `tiago-cassio` · personagem · **Épico**
- **Ref.:** `Documentacao/Personagens/CHORAO-01_Chorao_Principal/` (`Chorao_Principal_Ref_01.png` — físico e rosto inspirados diretamente no Chorão).
- **Descrição visual (definida pelo Enzo):** **Inspirado no Chorão.** Homem adulto muito gordo e corpulento, com grande barriga saliente, braços grossos, pescoço curto, rosto largo avermelhado, nariz bulboso, cabelo preto curto e cacheado nas laterais com topo da cabeça ralo/calvo e barba por fazer escura no queixo — mas, ao contrário do Chorão chorando de macacão, Tiago Cássio está com pose e expressão de **agiota/cobrador implacável de Aura**, sorriso cínico de canto de boca, puxando com uma mão todas as orbes de Aura dourada do inimigo como um ímã e concentrando na outra mão seis esferas colossais de energia prontas para um disparo letal.
- **Frase:** *"Empresta essa aura aí rapidão."*
- **Prompt:** `Homem adulto muito gordo e corpulento com grande barriga saliente, rosto largo avermelhado, nariz redondo, cabelo preto curto nas laterais com topo calvo e barba por fazer escura, com expressão cínica e intimidadora de cobrador, puxando com uma mão um feixe de esferas de luz dourada roubadas enquanto carrega na outra mão seis esferas gigantescas de energia cósmica dourada prestes a explodir.` + épico.

**#041 PMLDM** — `pmldm` · personagem · **Lendário**
- **Ref.:** Personagem inédita descrita pelo Enzo + `Documentacao/Personagens/ITALOLOL-01_ItaloLOL_Principal/` (acessórios do ItaloLOL) + Xayah de League of Legends.
- **Descrição visual (definida pelo Enzo):** **Uma menina com cabelo vermelho, com franja, de pele bem branca, com aspectos inspirados na Xayah de League of Legends, um corpo levemente violão, com um óculos preto redondo, e acessórios que lembram o ItaloLOL.** Garota jovem de pele bem branca (pálida), cabelo vermelho-carmim vivo com franja reta na testa, silhueta de corpo levemente violão, usando **óculos pretos de armação redonda** (idênticos ao estilo do ItaloLOL). Possui elementos visuais inspirados na **Xayah de League of Legends**: orelhas pontudas/plumadas no topo da cabeça, capuz/manto escuro estilizado com penas afiadas carmesim e violeta flutuando entre os dedos como adagas. Usa **acessórios que lembram o ItaloLOL**: a corrente dourada grossa no pescoço, detalhes em preto e rosa-magenta na roupa, unhas pintadas de preto e um broche/chaveiro do cãozinho amarelo ItaloLOL preso ao cinto.
- **Frase:** *"40/0/100 de Ezreal."*
- **Prompt:** `Garota jovem de pele bem branca, cabelo vermelho vivo com franja na testa, corpo levemente violão, usando óculos pretos redondos e uma corrente dourada grossa no pescoço com acessórios em preto e rosa e um chaveiro de cãozinho amarelo; veste um manto e capuz estilo guerreira vastaya inspirada na Xayah com orelhas de plumas no topo da cabeça e penas afiadas brilhantes vermelhas e roxas flutuando entre seus dedos em pose épica.` + lendário.

**#041-B PMLDM (Transformação: Itallo Lendário de EZREAL 40/0/100)** — `pmldm-ezreal` · transformação de combate · **Lendário**
- **Ref.:** `Documentacao/Personagens/ITALOLOL-01_ItaloLOL_Principal/` + PMLDM (`#041`) + Ezreal (League of Legends).
- **Descrição visual:** A forma suprema despertada pelo ataque de 3 Auras da PMLDM: ItaloLOL (cãozinho amarelo de óculos redondos, orelhas marrons caídas, topete preto e rosa e corrente dourada, acompanhado pela aura plumada vermelha da PMLDM) levitando em estado divino com a **Manopla Arcana dourada de Ezreal** brilhando intensamente na pata/braço, disparando uma barragem de arcos de luz dourada e feixes místicos em todas as direções, cercado por um escudo translúcido de imunidade absoluta.
- **Prompt:** `Cãozinho amarelo antropomórfico de orelhas marrons caídas, óculos redondos e topete preto e rosa levitando em pose divina de capa de gibi, vestindo jaqueta de explorador arcano e uma manopla dourada brilhante gigante no braço que dispara múltiplos arcos e feixes de energia dourada em todas as direções, penas vermelhas brilhantes voando ao redor e uma barreira esférica de luz dourada protegendo seu corpo.` + lendário.

**#042 Pidão do Vape** — `pidao-do-vape` · goon · **Comum**
- **Ref.:** `Documentacao/Personagens/SUPERKID-01_SuperKid_Padrao/` (referência ao vape/pod que distrai o Superkid na Art Bible).
- **Descrição visual:** Capanga folgado e oportunista em uma roda de rua à noite, esticando o braço com cara de pidão para pegar emprestado um vape/pod eletrônico colorido que brilha com uma luz de Aura dourada roubada; ao mesmo tempo em que puxa uma nuvem gigante de vapor misturada com Aura, ele segura o próprio peito com a outra mão, roxo de tossir e soltando fumacinha cinza de dano pulmonar progressivo.
- **Frase:** *"Deixa eu dar só um puxãozinho?"*
- **Prompt:** `Personagem capanga folgado de moletom largo em uma esquina à noite, esticando a mão com sorriso pidão para puxar o vapor de um dispositivo eletrônico pequeno brilhante que suga uma esfera de luz dourada, enquanto segura o próprio peito com a outra mão tossindo em meio a uma nuvem densa de fumaça branca e cinza.` + comum.

---

## Reserva (próxima leva)
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
