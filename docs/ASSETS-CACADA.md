# Artes da "Caçada ao Inominável" — guia completo para gerar os assets

Este arquivo é para **outra IA (ou artista) criar todas as imagens definitivas** do jogo do
Degustador da Noite, um metroidvania 2D inspirado em Hollow Knight. Hoje o jogo usa artes
temporárias (sprites antigos da Ronda e desenhos feitos por código). Aqui está **tudo** o que
precisa ser desenhado: personagens, animações quadro a quadro, inimigos, chefes, efeitos,
objetos, tiles, fundos, interface e telas. Cada item diz **resolução, quantos quadros, a
velocidade da animação, onde aparece no jogo e o que desenhar**.

## Status (setembro de 2026)
A primeira leva de artes chegou e **já está no jogo**. Ela veio no formato da versão
anterior deste guia: Degustador em quadros de 128 px, tiles de 64 px, fundos de 1280×720, direto
em `assets/<pasta>/` (sem a subpasta `cacada/`). O código se adaptou a isso. **As próximas
artes podem seguir as mesmas pastas e tamanhos da primeira leva**; os tamanhos 4× abaixo
continuam sendo o ideal, mas não são obrigatórios.

**Ainda faltam** (hoje desenhados por código):
- Inimigos: **Ping**, **Emoji Raivoso**, **Troll**, **Spam Saltitante**, **Moderador**,
  **Feiticeira** (a atual é a antiga da Ronda) e a **Sombra do Degustador** (hoje é o Degustador
  pintado de roxo).
- ItaloLOL da tela da loja, balão de fala, ícones da loja, caixa das placas.
- Quadros extras que deixariam as animações mais suaves: `virar`, `frear`, `pousar`, `topo`,
  mais quadros de `parado`/`golpe`/`dash`, `sentar`, `interagir`, `pegou-item`.
- Kit completo de tiles por área (cantos, lados, teto e variações) e fundos em camadas.

Leia antes de desenhar:
- A **direção de arte** (seção 1). Ela é o que garante que todos os assets pareçam do mesmo jogo.
- As **regras técnicas** (seção 2).
- As fichas oficiais: `assets/Personagens/Degustador da noite Ficha.png` e
  `assets/Personagens/O Inominavel Ficha.png`.
- Como o jogo funciona: `docs/PLANO-CACADA.md` e `docs/PESQUISA-HOLLOW-KNIGHT.md`.

Sumário
1. Direção de arte (estilo único para tudo)
2. Regras técnicas (resolução, formato, alinhamento, nomes)
3. Como gerar com IA sem perder a consistência
4. Degustador da Noite (jogador)
5. Sombra do Degustador
6. O Inominável e os NPCs
7. Inimigos
8. Chefes
9. Ataques, projéteis e efeitos
10. Objetos do mundo e coletáveis
11. Perigos e plataformas
12. Tiles, decoração e fundos de cada área
13. Interface (HUD)
14. Telas e menus
15. Controles de toque (opcional)
16. Checklist final e como trocar no código

---

## 1. Direção de arte

### 1.1 A frase que resume tudo
> **Gibi noturno com alma de Hollow Knight**: personagens de cartoon com **contorno escuro e
> cores chapadas**, vivendo num **mundo escuro, melancólico e cheio de névoa**, onde cada área
> tem **uma cor de luz própria** e só o que importa para jogar brilha.

O humor vem dos personagens (o Degustador com roupa de Batman mal feita, o chat corrompido
virando monstro). O **mundo** é levado a sério: silencioso, escuro e bonito, como a
Hallownest de Hollow Knight.

### 1.2 Traço
- **Contorno** em quase-preto `#120d1a` (nunca preto puro), espessura **8 px** na resolução de
  fonte para personagens e inimigos (≈ 2 px na tela), **6 px** para objetos pequenos e
  efeitos, **4 px** para detalhes internos. Chefes usam **12 px**.
- Linha **limpa e segura**, levemente mais grossa embaixo e nas bordas externas (peso), mais fina
  por dentro. Nada de rabisco, textura de lápis ou traço áspero.
- **Tiles e fundos não têm contorno preto grosso**: tiles usam só uma borda escura de 4 px no
  lado que fica exposto; fundos não têm contorno nenhum (só formas e valores).

### 1.3 Cor e luz
- **Cores chapadas** com **uma sombra** (cel shading de 2 tons) e, no máximo, **um brilho**.
  Sem degradê realista nos personagens.
- **Luz principal vindo de cima**, levemente da esquerda. Sombra embaixo e à direita.
- **Luz de borda (rim light)** de 2 a 4 px na **cor da área** (tabela 1.5) no lado direito dos
  personagens. Isso "encaixa" o personagem no ambiente. Para manter o arquivo reutilizável, a luz
  de borda do **Degustador** é **lilás neutro** `#b9a4ff` (serve em todas as áreas).
- **Saturação só onde importa.** Fundo: escuro e dessaturado. Chão e paredes jogáveis: tom médio.
  Personagens, inimigos e perigos: mais contraste e mais saturação.

### 1.4 Hierarquia de leitura (a regra mais importante)
Do mais apagado para o mais chamativo:

| Camada | Contraste | Saturação | Exemplo |
|---|---|---|---|
| Céu e fundo distante | muito baixo | baixa | cidade em silhueta na névoa |
| Fundo próximo e decoração | baixo | baixa a média | canos, racks, janelas |
| Tiles jogáveis (onde se pisa) | médio, **borda de cima clara** | média | telhado, chapa, piso |
| Objetos interativos | médio-alto + **brilho amarelo quente** | média | banco, alavanca, placa, loja |
| Personagens e inimigos | alto | alta | Degustador, Capanga, Ping |
| **Perigos** | **máximo, sempre vermelho/laranja quente** | alta | espinhos, serras, projéteis |
| Coletáveis | alto + **dourado** | alta | vírgulas, fragmento, orbe |

Códigos de cor que o jogador aprende e que **nunca podem ser usados para outra coisa**:
- **Vermelho/laranja quente** (`#ff3b3b`, `#ff6a2a`) = machuca.
- **Amarelo/dourado** (`#ffd23f`) = dá para pegar ou usar.
- **Rosa** (`#ff8ca0`) = vida/cura (cogumelos, Degustar).
- **Verde tóxico** (`#5aff78`) = o Inominável e a corrupção dele.
- **Lilás/branco** (`#e6d6ff`) = o Degustador e as coisas dele (golpe, poeira, Pontuação).

### 1.5 Paleta
**Base do mundo (todas as áreas)**

| Uso | Hex |
|---|---|
| Contorno | `#120d1a` |
| Escuro mais fundo | `#07041a` |
| Névoa/fundo distante | `#1c0f45` |
| Branco do jogo (textos, arco do golpe) | `#fff8ee` |
| Lilás do Degustador | `#e6d6ff` / `#b9a4ff` |
| Laranja da MP5K e da marca | `#ff6600` |
| Roxo da marca | `#7b2cbf` |

**Cor de cada área** (luz de borda, topo dos tiles, detalhes do fundo)

| Área | Luz/destaque | Parede | Tijolo/detalhe | Céu/fundo (3 tons, de cima para baixo) |
|---|---|---|---|---|
| Telhados da Toradolândia | `#8a2be2` / claro `#b77cff` | `#2a1450` | `#351a63` | `#07041a` `#1c0f45` `#3a1a6b` |
| Beco das Chaminés | `#c0583a` / claro `#e8876a` | `#3a1a14` | `#4d2419` | `#0c0605` `#1d0d09` `#2d140e` |
| Fábrica do Chat | `#e08a2c` / claro `#ffc07a` | `#23262e` | `#2f333d` | `#0b0c10` `#15171d` `#1f222a` |
| Torre dos Servidores | `#2bb3c0` / claro `#8ff1ff` | `#0f2430` | `#153140` | `#03080d` `#081520` `#0d2030` |
| Covil do Inominável | `#5aff78` / claro `#c4ffd0` + roxo | `#1a0f24` | `#241533` | `#04020a` `#140a24` `#1f0f35` |

**Personagens (cores fixas em todos os quadros)**
- Degustador: roupa cinza `#8d8f99` (sombra `#5f616c`), morcego e capa `#1b1b22`, fita adesiva
  `#c9c2b0`, cinto `#7a4a24`, gorro do Teemo verde `#5a8c2b` (sombra `#3d6420`), óculos de
  aviador `#c2733a` com lente `#9ad6ff`, pele `#e8b48a`, barba `#5a3a22`, **MP5K `#ff6600`**.
- Inominável: camisa preta `#1b1b22` com arte do Gorillaz, jeans `#3b5a8a`, pele `#e0a57e`,
  cabelo e barba `#6b4428`, notebook cinza com logo do Discord `#5865f2`, aura roxa `#9b5cff` e
  verde `#5aff78`.

### 1.6 Formas (linguagem visual)
- **Degustador**: formas arredondadas, meio desengonçadas, "feito em casa" (remendos, fita,
  capa rasgada). Cabeça grande em relação ao corpo (proporção de **3 cabeças de altura**, como os
  personagens de Hollow Knight). A **MP5K laranja** está sempre visível: é a marca dele.
- **Inimigos do chat**: nascem de **elementos de interface de internet** (balão de
  notificação, emoji, envelope de e-mail, escudo de moderador) + **falhas de glitch**
  (pixels deslocados rosa `#ff4fd8` e ciano `#3ff0ff`, que são o "sangue" deles). Formas simples
  e **silhueta reconhecível só pela sombra preta**.
- **Chefes**: silhueta grande, pesada, com **um elemento que avisa o ataque** (marreta erguida,
  punho de joinha, boca aberta).
- **Mundo**: arquitetura de cidade brasileira à noite (telhas de barro, lajes, caixas d'água,
  fios, pichação discreta) misturada com tecnologia (servidores, cabos, fábrica de memes).
  Linhas retas levemente tortas, nada perfeitamente geométrico.

### 1.7 Animação
- **Antecipação sempre**: todo ataque de inimigo tem **um quadro de aviso** claro (piscar,
  encolher, olho brilhando) antes do golpe. É o que torna o jogo justo, como em Hollow Knight.
- **Squash & stretch** leve (10–15%) em pulos, pousos e impactos.
- **Smear** (borrão de movimento) no quadro mais rápido de golpes e investidas.
- Contagem de quadros **econômica**: poucos quadros bem escolhidos (2–6) em vez de muitos.
  Velocidades em **fps** estão em cada tabela.
- "Loop" = repete; "1×" = toca uma vez e para no último quadro.

### 1.8 O que NÃO fazer
- Nada de fotorrealismo, 3D, pintura com textura pesada, pixel art ou estilo anime.
- Nada de texto escrito dentro das imagens (exceto onde indicado: "MOD", "BAN", logo).
- Nada de sombra projetada no chão dentro do sprite.
- Nada de fundo colorido ou "chão" embaixo do personagem. Fundo **transparente**.
- Não mudar as cores fixas dos personagens entre quadros.
- Não usar vermelho em nada inofensivo, nem dourado em nada que não se pega.

---

## 2. Regras técnicas

### 2.1 Resolução
A tela do jogo tem **640×360 px lógicos** e o tile mede **20×20 px**.
**Todo asset é desenhado a 4× o tamanho em que aparece no jogo** (fator de fonte **4×**).
Assim, 1 px do jogo = 4 px na arte, e dá para usar a mesma arte se o jogo passar a rodar em
1280×720 ou em 2560×1440.

| No jogo | Na arte (4×) |
|---|---|
| Tela 640×360 | 2560×1440 |
| Tile 20×20 | 80×80 |
| Degustador (~44 px de altura desenhado) | ~176 px de altura, em quadro 192×192 |

Nas tabelas abaixo: **"Arte"** = tamanho do arquivo; **"Jogo"** = tamanho aproximado na tela;
**"Colisão"** = caixa de colisão no jogo (o desenho pode passar um pouco dela, mas o corpo
principal deve caber nela para o jogador não achar injusto).

### 2.2 Formato
- **PNG 32 bits com fundo transparente** (menos os céus, que são opacos).
- Espaço de cor **sRGB**. Sem perfil de cor esquisito.
- Borda transparente de pelo menos **8 px** em volta do desenho dentro do quadro.
- **Um arquivo por quadro**: `correr-01.png`, `correr-02.png`… (o jogo monta as animações).
  Opcionalmente, também uma folha de sprites (`correr.png` com os quadros lado a lado, na ordem).

### 2.3 Alinhamento (essencial para a animação não "tremer")
- Personagens e inimigos de lado, **olhando para a DIREITA** (o jogo espelha para a esquerda),
  salvo quando a tabela disser o contrário.
- Todos os quadros de uma animação têm **o mesmo tamanho de quadro** e o **mesmo ponto de apoio
  (pivô)**:
  - Quem anda no chão: **pés na "linha dos pés"** indicada e **corpo centrado na coluna
    central**.
  - Quem voa: **centro do corpo no centro do quadro**.
- O pivô não muda entre animações do mesmo personagem (parado, correr, golpe… todos com os pés
  na mesma linha e o tronco na mesma coluna).

### 2.4 Pastas e nomes
```
assets/cacada/
  degustador/   sombra/   inominavel/   npcs/
  inimigos/     chefes/   efeitos/      objetos/
  perigos/      areas/<area>/           ui/        telas/     toque/
```
Nomes em minúsculas, sem acento, com hífen: `troll-investida-02.png`.

---

## 3. Como gerar com IA sem perder a consistência

1. **Comece pela folha de modelo** (`modelo-*.png`, seção 4.1): o Degustador de frente, de lado
   e de costas, com a paleta ao lado. Faça o mesmo para o Inominável e para cada chefe. Use
   essas folhas como **imagem de referência** em todas as gerações seguintes do personagem.
2. **Gere uma "placa de estilo"** antes de tudo: uma imagem de 2560×1440 com o Degustador num
   telhado da área Telhados, um Capanga e um Ping, tiles e fundo, no estilo final. Aprovada essa
   placa, **ela é a referência de estilo de todos os outros assets**.
3. Use **sempre o mesmo prefixo de prompt** (3.1) e, se a ferramenta deixar, a **mesma seed** e
   o mesmo modelo para um personagem inteiro.
4. Gere as animações **quadro a quadro com a pose-chave descrita**, usando o quadro anterior como
   referência. Depois **alinhe todos no pivô** (2.3) num editor.
5. **Pós-processamento obrigatório** de cada imagem:
   - remover o fundo (transparência limpa, sem halo branco);
   - reduzir para as cores da paleta (1.5) quando algo sair fora;
   - conferir o contorno (cor `#120d1a`, espessura certa);
   - redimensionar para o tamanho exato de "Arte";
   - **teste de leitura**: ver a imagem a 25% (tamanho do jogo) em cima do fundo da área. Se
     não der para entender o que é, simplificar.
6. Gere **por área**: tiles, decoração e fundo de uma área juntos, para as cores baterem.

### 3.1 Prefixo de prompt (use em tudo)
> Arte 2D para jogo metroidvania, estilo gibi noturno inspirado em Hollow Knight: contorno
> escuro limpo (#120d1a), cores chapadas com uma sombra (cel shading de 2 tons), luz vinda de
> cima, luz de borda suave na cor `<cor da área>`, clima escuro e melancólico. Leitura clara em
> tamanho pequeno. Sem texto, sem sombra no chão, fundo totalmente transparente.

### 3.2 Modelo para personagens e inimigos
> `<prefixo>` `<descrição do personagem com as cores fixas>`. Vista de lado, olhando para a
> direita. Pose: `<pose-chave do quadro>`. Quadro de `<L×A>` px, pés na linha `<N>` e corpo
> centralizado na coluna `<M>`. Mesmo design, mesma escala e mesma paleta da folha de modelo em
> anexo.

### 3.3 Modelo para tiles
> `<prefixo sem a parte da transparência>` Tile quadrado de 80×80 px que emenda perfeitamente
> nos quatro lados, visto de frente (câmera lateral de jogo de plataforma), `<material>` na cor
> `<hex>`. Sem perspectiva, sem sombra de fora, sem contorno grosso.

### 3.4 Modelo para fundos
> Pintura de fundo para jogo 2D de plataforma, estilo Hollow Knight com formas simples e
> chapadas, `<cena>`, paleta `<3 hex da área>`, névoa, baixo contraste, sem personagens, sem
> texto. 2560×1440, emenda na horizontal (lado esquerdo continua no direito).

Exemplo completo (Ping, quadro 1 de 2):
> Arte 2D para jogo metroidvania, estilo gibi noturno inspirado em Hollow Knight: contorno
> escuro limpo (#120d1a), cores chapadas com uma sombra, luz vinda de cima, clima escuro. Um
> balão de notificação vermelho (#ff3b3b) redondo com um ponto de exclamação branco no meio e
> duas asinhas de morcego pretas **para cima**, pixels de glitch rosa e ciano soltando da borda.
> Vista de lado, olhando para a direita. Quadro de 96×96 px, centralizado. Fundo transparente,
> sem texto além do "!".

---

## 4. Degustador da Noite (jogador)

Pasta `assets/cacada/degustador/` · **quadro 192×192** · **pés na linha 184**, tronco na
**coluna 96** · olhando para a **direita** · no jogo: ~44 px de altura · colisão **14×26**.

**Visual** (da ficha): roupa de Batman mal feita, cinza, com **remendos de fita adesiva** e
morcego preto no peito; **capa preta rasgada**; cinto marrom de utilidades; **gorro do Teemo**
verde com orelhinhas e **óculos de aviador** na testa; óculos de grau; barba; **MP5K laranja**
(é a arma e, virada, a "coronha" do ataque corpo a corpo). Proporção de 3 cabeças.

### 4.1 Folhas de modelo (referência, não entram no jogo)
| Arquivo | Arte | O que mostrar |
|---|---|---|
| `modelo-frente-lado-costas` | 1536×768 | As 3 vistas lado a lado, pose neutra, com a paleta em quadradinhos embaixo. |
| `modelo-expressoes` | 1024×512 | Cabeça: normal, determinado, dor, comendo feliz, derrotado. |

### 4.2 Animações
| Arquivo(s) | Quadros | fps | Tipo | Onde aparece | Poses-chave |
|---|---|---|---|---|---|
| `parado-01..04` | 4 | 6 | loop | parado no chão | Respiração: ombros sobem e descem 4 px na arte, capa balança, MP5K apontada para baixo. |
| `virar` | 1 | — | 1× | trocar de lado parado | Meio de frente, capa girando (um quadro de transição). |
| `correr-01..06` | 6 | 12 | loop | andando/correndo | Corrida inclinada: 01 contato pé direito, 02 passagem, 03 impulso, 04 contato pé esquerdo, 05 passagem, 06 impulso. Capa esvoaçando para trás. |
| `frear` | 1 | — | 1× | parar de correr | Corpo para trás, pé da frente derrapando (poeira vem do efeito). |
| `pular-01..02` | 2 | 12 | 1× | subindo | 01 impulso (pernas esticadas), 02 subida (joelhos encolhidos, capa para baixo). |
| `topo` | 1 | — | 1× | no alto do pulo | Corpo solto, capa flutuando. |
| `cair-01..02` | 2 | 10 | loop | caindo | Braços um pouco abertos, capa para cima, alterna ondulação da capa. |
| `pousar` | 1 | — | 1× (0,08 s) | ao tocar o chão | Agachado (squash), capa caindo. |
| `golpe-frente-01..03` | 3 | 24 | 1× | coronhada para a frente | 01 arma recuada atrás do ombro (antecipação), 02 **coronha no alcance máximo** (smear), 03 recuperação. |
| `golpe-cima-01..02` | 2 | 24 | 1× | coronhada para cima | 01 arma embaixo, 02 coronha apontada para o alto, corpo esticado. |
| `golpe-baixo-01..02` | 2 | 24 | 1× | no ar, para baixo (pogo) | 01 joelhos encolhidos, arma em cima, 02 coronha apontada para baixo entre os pés. |
| `golpe-diagonal-cima-01..02` | 2 | 24 | 1× | diagonal para cima-frente | Coronha a 45° para cima-frente. |
| `golpe-diagonal-baixo-01..02` | 2 | 24 | 1× | diagonal para baixo-frente | Coronha a 45° para baixo-frente (no ar também faz pogo). |
| `golpe-rasteira-01..02` | 2 | 24 | 1× | no chão, para baixo | Agachado, coronha varrendo o chão na altura dos pés. |
| `dash-01..03` | 3 | 20 | 1× | **Capa Janky** | 01 corpo abaixando, 02 **esticado na horizontal**, capa em rastro longo, 03 saindo do dash. |
| `pulo-duplo-01..03` | 3 | 18 | 1× | **Parênteses** | Cambalhota no ar: 01 encolhido, 02 de cabeça para baixo, 03 abrindo. (Os parênteses de energia são efeito à parte, 9.3.) |
| `parede-01..02` | 2 | 8 | loop | **grudado e deslizando** (Luvas de Fita) | **Parede à ESQUERDA do desenho**, costas nela, as duas mãos com fita presas, corpo olhando para a direita (para longe da parede), pernas dobradas. Alterna mão de cima. |
| `pulo-parede` | 1 | — | 1× (0,1 s) | impulso da parede | Empurrando com os pés, corpo saindo para a direita. |
| `agarrado` | 1 | — | parado | pendurado na beirada | Quina no **canto superior direito**, as duas mãos segurando na linha ~40, corpo pendurado. |
| `subir-01..03` | 3 | 18 | 1× | subindo a beirada | Cotovelo em cima, joelho em cima, de pé. |
| `rajada-01..03` | 3 | 20 | 1× | **Rajada da MP5K** | 01 arma apontada, 02 **recuo** (clarão sai do cano: efeito 9.2), 03 volta. |
| `degustar-01..04` | 4 | 8 | loop | **Degustar** (cura, segurando) | Parado, tira uma coxinha do cinto, mastiga (02–04 alternam boca), olhos fechados de prazer. |
| `curou` | 1 | — | 1× | cogumelo recuperado | Braço para cima, satisfeito. |
| `sentar-01..02` + `sentado-01..02` | 2 + 2 | 8 / 3 | 1× + loop | no banco | Sentando; depois sentado relaxado, respiração lenta. |
| `levantar` | 1 | — | 1× | sair do banco | Meio de pé. |
| `interagir` | 1 | — | 1× | ler placa / falar | De costas de leve, cabeça virada para cima. |
| `dano` | 1 | — | 1× (0,2 s) | levou dano | Corpo jogado para trás, careta, gorro torto. |
| `morrer-01..03` | 3 | 10 | 1× | morreu | Joelhos cedem, cai de lado, gorro voando. |
| `pegou-item` | 1 | — | 1× | pegou habilidade | Segurando o orbe para cima com as duas mãos, luz dourada no rosto. |

---

## 5. Sombra do Degustador

Pasta `assets/cacada/sombra/` · **quadro 192×192**, centro do corpo em (96, 96) · voa · colisão
**16×24** · aparece onde o jogador morreu e guarda as vírgulas (a "Shade" de Hollow Knight).

Visual: **silhueta do próprio Degustador** (mesma forma, mesmo gorro com orelhas, mesma capa) em
roxo-escuro translúcido `#2a1450` (70% de opacidade desenhada na arte), **olhos roxos claros
brilhando** `#c9a4ff`, fiapos de fumaça saindo das bordas, **sem contorno preto** (contorno
roxo claro fino de 4 px).

| Arquivo(s) | Quadros | fps | Tipo | Poses |
|---|---|---|---|---|
| `pairar-01..04` | 4 | 8 | loop | Flutuando, fumaça ondulando. |
| `preparar` | 1 | — | 1× | Encolhida, olhos piscando forte (aviso da investida). |
| `investida-01..02` | 2 | 16 | loop | Esticada para a frente, rastro de fumaça. |
| `sumir-01..04` | 4 | 12 | 1× | Derrotada: se desfaz em fumaça roxa. |

---

## 6. O Inominável e os NPCs

### 6.1 O Inominável
Pasta `assets/cacada/inominavel/` · **quadro 256×256**, **pés na linha 248**, corpo na
**coluna 128** · olhando para a **ESQUERDA** (ele sempre encara o jogador que vem da esquerda) ·
no jogo ~52 px de altura. Aparece em várias salas debochando e foge; na sala final, assiste
à luta.

Visual (da ficha): gordinho, cabelo castanho em **rabo de cavalo**, **barba**, **óculos**,
camisa preta **do Gorillaz** esticada na barriga, jeans, tênis, **notebook aberto com o logo do
Discord**; **aura roxa e verde** pulsando em volta.

| Arquivo(s) | Quadros | fps | Tipo | Onde / poses |
|---|---|---|---|---|
| `modelo-frente-lado-costas` | — | — | ref. | Folha de modelo como a do Degustador. |
| `parado-01..04` | 4 | 6 | loop | Segurando o notebook, sorriso de deboche, aura pulsando. |
| `digitar-01..02` | 2 | 8 | loop | Digitando no notebook (quando fala no "chat"). |
| `rir-01..02` | 2 | 8 | loop | Rindo apontando para o jogador ("Kkkk"). |
| `fugir-01..04` | 4 | 12 | loop | Correndo para a **direita** (neste caso olha para a direita), notebook debaixo do braço. |
| `sumir-01..03` | 3 | 12 | 1× | Some num glitch verde (sai da sala). |
| `gritar-01..02` | 2 | 10 | loop | "Boca de Fossa": boca enorme aberta, linhas de grito (luta final, atrás do Opressor). |
| `derrotado-01..02` | 2 | 4 | loop | Sentado no chão, olhos em espiral, notebook fechado no colo. |

### 6.2 ItaloLOL (vendedor)
Pasta `assets/cacada/npcs/` · **quadro 256×256**, pés na linha 248 · fica **atrás do balcão**
da loja (só da cintura para cima aparece; desenhe o corpo inteiro assim mesmo).

| Arquivo(s) | Quadros | fps | Tipo | Poses |
|---|---|---|---|---|
| `italolol-parado-01..02` | 2 | 3 | loop | Braços apoiados no balcão, entediado. |
| `italolol-falar-01..02` | 2 | 8 | loop | Falando, mão aberta oferecendo. |
| `italolol-feliz` | 1 | — | 1× | Comprou algo: sorrisão, joinha. |
| `italolol-retrato` | 1 | — | — | **512×512**, busto de frente, para a tela da loja. |

> Se o Henrique quiser outro personagem como vendedor, mantenha os mesmos arquivos e tamanhos.

### 6.3 Balão de fala
`ui/balao-fala` (9 partes, veja 13.5): balão branco-creme `#fff8ee` com contorno `#120d1a` e
rabinho embaixo. Usado nas falas do Inominável.

---

## 7. Inimigos

Pasta `assets/cacada/inimigos/` · olhando para a **direita** · todos são "o chat corrompido do
Inominável" (seção 1.6). Cada inimigo tem também **`<nome>-morrer-01..03`** (se desfaz em
pixels de glitch rosa e ciano, 12 fps, 1×) e um quadro **`<nome>-dano`** (encolhido, olho
fechado; o jogo pisca branco por cima).

| Inimigo (inspiração HK) | Arte do quadro · pivô | Jogo / colisão | Animações (quadros, fps, tipo) | Visual e comportamento |
|---|---|---|---|---|
| **Capanga do Coração** (Crawlid) | 128×128 · pés linha 124 | ~32 px / 18×22 | `andar` 4, 8, loop · `virar` 1 | Barbudo de camiseta branca com **coração vermelho**, jeans, cara de bravo. Anda e vira na beirada. É o inimigo mais básico: silhueta simples e redonda. |
| **Ping** (Vengefly) | 96×96 · centro | ~24 px / 16×14 | `pairar` 2, 10, loop · `alerta` 1 (viu você: "!" pisca) · `caca` 2, 16, loop (asas rápidas, inclinado para a frente) | **Balão de notificação** vermelho `#ff3b3b` com "!" branco, asinhas de morcego pretas. Paira, **vê você e persegue voando**. |
| **Emoji Raivoso** (Gruzzer) | 96×96 · centro | ~24 px / 16×16 | `voar` 2, 10, loop · `quicar` 1 (amassado ao bater na parede) | Carinha **amarela** brava, bochechas vermelhas, veia na testa, asinhas. Voa em diagonal e **quica nas paredes**. |
| **Drone do Inominável** (Aspid) | 128×128 · centro | ~32 px / 20×16 | `voar` 2, 16, loop (hélices) · `mirar` 2, 12, loop (**olho vermelho brilhando**: aviso) · `atirar` 1 | Quadricóptero preto, luz roxa embaixo, **um olho vermelho** no meio. Fica longe e **cospe bolas verdes em leque**. |
| **Troll** (Mosscharger) | 160×160 · pés linha 152 | ~40 px / 22×24 | `andar` 4, 8, loop · `preparar` 2, 16, loop (**tremendo, olhos vermelhos**: aviso) · `investida` 2, 16, loop (smear) · `cansado` 2, 4, loop (língua de fora, suor) | Corcunda de **moletom verde** com capuz, **sorriso enorme de troll-face**. Vê você, prepara e **dispara numa investida**. |
| **Spam Saltitante** (Leaping Husk) | 128×128 · pés linha 120 | ~28 px / 18×16 | `parado` 2, 4, loop · `agachar` 1 (**aviso**) · `pular` 1 (esticado) · `cair` 1 | **Envelope de e-mail** branco com carimbo vermelho "SPAM" (pode ter o texto), aba com **dentinhos**, perninhas finas. Agacha e **pula em cima de você**. |
| **Bug** (Tiktik) | 96×96 · pés linha 88 | ~20 px / 14×14 | `andar` 2, 8, loop | Besouro **roxo-escuro** com casco de pixels e manchas de glitch rosa/ciano, antenas. Anda **em volta dos blocos**, inclusive paredes e teto. **Desenhe andando no chão**; o jogo gira nas paredes e no teto. |
| **Moderador** (Husk Sentry) | **256×160** · pés linha 152, corpo na coluna 96 (o martelo avança para a direita) | ~40 px / 20×28 | `guarda` 2, 4, loop (escudo na frente) · `andar` 4, 6, loop · `erguer` 1 (**martelo no alto**: aviso) · `golpe` 2, 20, 1× (estocada para a frente até a borda direita) · `recuperar` 1 · `bloqueio` 1 (faísca no escudo) | Armadura cinza de guarda, **escudo azul com "MOD"** e **martelo do "BAN"** (pode ter o texto). Bloqueia golpes de frente; vulnerável por cima e por trás. |
| **Feiticeira** (Soul Twister) | 160×160 · centro | ~40 px / 20×28 | `flutuar` 4, 8, loop · `sumir` 3, 16, 1× · `aparecer` 3, 16, 1× · `conjurar` 2, 10, loop (mãos brilhando rosa: aviso) | Cabelo roxo/rosa, casaco escuro longo, flutua sem pés (fumaça). **Olha para a DIREITA** (a arte antiga olha para a esquerda). Teleporta e lança magia que persegue. |

---

## 8. Chefes

Pasta `assets/cacada/chefes/` · contorno de **12 px** · olhando para a **direita**.

### 8.1 Capanga-Mor (inspirado no False Knight) — Arena do Beco
**Quadro 384×320**, **pés na linha 312**, corpo na **coluna 176** (a marreta passa para a
direita) · no jogo ~80 px de altura · colisão **40×52** · 26 de vida; na metade fica mais
rápido (fase 2: veias saltando e olhos vermelhos nos mesmos quadros → gere também a variação
`-fase2` de `ocioso`, `corrida` e `marreta`).

Visual: **o Capanga do Coração gigante e bombado**, camiseta rasgada com o coração, bandana,
**marreta enorme** de cabo de madeira.

| Arquivo(s) | Quadros | fps | Tipo | Poses (e o ataque) |
|---|---|---|---|---|
| `capanga-mor-entrada-01..03` | 3 | 8 | 1× | Pula do alto e cai na arena, poeira. |
| `capanga-mor-ocioso-01..02` | 2 | 4 | loop | Respirando pesado, marreta no ombro. |
| `capanga-mor-salto-prep` | 1 | — | 1× | Agachado (**aviso do salto**). |
| `capanga-mor-salto` | 1 | — | 1× | No ar, marreta erguida. |
| `capanga-mor-pouso` | 1 | — | 1× | Aterrissa: solta **ondas de choque** (9.4). |
| `capanga-mor-corrida-prep` | 1 | — | 1× | Inclina para trás, bufando (**aviso**). |
| `capanga-mor-corrida-01..03` | 3 | 12 | loop | Correndo com a marreta arrastando. |
| `capanga-mor-atordoado-01..02` | 2 | 6 | loop | Bateu na parede: sentado, estrelinhas girando. Cai **entulho** do teto (9.4). |
| `capanga-mor-marreta-prep` | 1 | — | 1× | **Marreta no alto** (aviso). |
| `capanga-mor-marreta-01..02` | 2 | 20 | 1× | Marretada no chão à frente (smear na 01). |
| `capanga-mor-recuperar` | 1 | — | 1× | Puxando a marreta do chão. |
| `capanga-mor-dano` | 1 | — | 1× | Encolhido. |
| `capanga-mor-derrotado-01..03` | 3 | 6 | 1× | Cai de joelhos e desaba, marreta caindo. |

### 8.2 O Opressor do Chat (chefe final) — Covil
**Quadro 384×384**, **centro do corpo em (192, 192)** · voa · no jogo ~96 px · colisão **56×64** ·
40 de vida; fase 2 na metade (mais glitch e cor mais verde → variação `-fase2` de `flutuar`).

Visual: o **Stand do Inominável** da ficha — sombra gigante feita de **texto de chat e código
glitch**, **olhos roxos** brilhando, fumaça roxa e verde, **uma mão enorme fazendo joinha**.
Não tem pernas; a parte de baixo se desfaz em fumaça.

| Arquivo(s) | Quadros | fps | Tipo | Poses (e o ataque) |
|---|---|---|---|---|
| `opressor-surgir-01..04` | 4 | 10 | 1× | Aparece se montando a partir de letras. |
| `opressor-flutuar-01..04` | 4 | 8 | loop | Flutuando, fumaça e letras girando. |
| `opressor-joinha-prep` | 1 | — | 1× | Mão de joinha erguida, olhos acesos (**aviso**: no chão aparece a mira, 9.4). |
| `opressor-joinha` | 1 | — | 1× | Mão baixando (o **punho** que esmaga é asset separado, 9.4). |
| `opressor-grito-01..02` | 2 | 10 | loop | Boca de fossa aberta cuspindo palavras. |
| `opressor-glitch-01..02` | 2 | 16 | loop | Corpo rachado em quadradinhos, atirando glitch em leque. |
| `opressor-invocar` | 1 | — | 1× | Braços abertos, dois **Pings** surgindo. |
| `opressor-dano` | 1 | — | 1× | Chiado, corpo deslocado para o lado. |
| `opressor-derrotado-01..05` | 5 | 8 | 1× | Se desmancha em letras que caem. |

---

## 9. Ataques, projéteis e efeitos

Pasta `assets/cacada/efeitos/` · efeitos **não têm contorno preto** (são luz), a não ser que a
tabela diga. Tudo apontando para a **direita**; o jogo gira.

### 9.1 Do Degustador
| Arquivo(s) | Arte | Quadros · fps | Onde / o que é |
|---|---|---|---|
| `golpe-arco-01..03` | 192×192, **centro do Degustador em (48, 96)** (o arco sai para a direita) | 3 · 24 · 1× | **Arco da coronhada**: meia-lua **branca** `#fff8ee` com borda **laranja** `#ff6600`, abrindo (01), inteira (02) e sumindo (03). O jogo gira para as 8 direções. |
| `golpe-rasteira-01..03` | 192×96 | 3 · 24 · 1× | Arco baixo e achatado, rente ao chão. |
| `acerto-01..03` | 96×96 | 3 · 24 · 1× | Estrela branca de impacto quando a coronhada acerta. |
| `pogo-01..02` | 96×64 | 2 · 20 · 1× | Faísca branca embaixo dos pés ao quicar. |
| `rajada-01..02` | 128×64 | 2 · 16 · loop | **Rajada da MP5K** (jogo: 30×16): três balas com rastro **laranja**, brilho amarelo. |
| `clarao-cano` | 64×64 | 1 | Clarão laranja na ponta da MP5K ao atirar. |
| `dash-rastro-01..03` | 256×128 | 3 · 20 · 1× | Rastro escuro da Capa Janky (capa esticada, pedaços de pano). |
| `parenteses-01..03` | 192×192 | 3 · 18 · 1× | **Parênteses** `( )` de energia lilás abrindo dos lados do corpo no pulo duplo. |
| `parede-faisca-01..02` | 48×48 | 2 · 16 · loop | Faíscas das luvas ao deslizar na parede. |
| `degustar-brilho-01..04` | 192×192 | 4 · 10 · loop | Brilho **rosa** subindo em espiral durante a cura. |
| `cura-01..03` | 128×128 | 3 · 12 · 1× | Estouro rosa com um "+" quando o cogumelo volta. |
| `poeira-pulo-01..03` | 96×48 | 3 · 18 · 1× | Poeira lilás ao pular. |
| `poeira-pouso-01..03` | 128×48 | 3 · 18 · 1× | Poeira dos dois lados ao pousar. |
| `poeira-corrida-01..03` | 48×48 | 3 · 18 · 1× | Poeirinha atrás dos pés correndo e freando. |
| `dano-01..03` | 192×192 | 3 · 20 · 1× | Estouro vermelho e preto quando o Degustador leva dano. |
| `morte-01..04` | 256×256 | 4 · 12 · 1× | Explosão roxa e laranja quando morre. |

### 9.2 Dos inimigos
| Arquivo(s) | Arte | Quadros · fps | Onde / o que é |
|---|---|---|---|
| `bola-verde-01..02` | 64×64 | 2 · 12 · loop | Cuspe do Drone (jogo ~12 px): bola **verde ácido** com núcleo claro e **borda vermelha fina** (é perigo). |
| `magia-01..02` | 64×64 | 2 · 12 · loop | Magia teleguiada da Feiticeira (jogo 12 px): esfera **rosa** com rastro. |
| `magia-rebatida-01..02` | 64×64 | 2 · 20 · 1× | Magia se desfazendo ao ser rebatida pelo golpe ("TOC!"). |
| `inimigo-morte-01..04` | 128×128 | 4 · 16 · 1× | Estouro de **pixels de glitch** rosa e ciano (serve para todos). |
| `bloqueio-01..02` | 64×64 | 2 · 20 · 1× | Faísca azul no escudo do Moderador. |
| `alerta` | 32×48 | 1 | "!" vermelho que aparece sobre um inimigo quando ele te vê. |

### 9.3 Dos chefes
| Arquivo(s) | Arte | Quadros · fps | Onde / o que é |
|---|---|---|---|
| `onda-01..02` | 64×96 | 2 · 12 · loop | Onda de choque do Capanga-Mor correndo no chão (jogo 14×22): arco laranja de poeira. |
| `entulho-01..03` | 64×64 | 3 variações | Pedras que caem do teto (jogo ~14 px): tijolo e reboco, borda vermelha fina. |
| `entulho-quebrar-01..02` | 96×48 | 2 · 16 · 1× | Pedra quebrando no chão. |
| `punho-mira-01..02` | 160×32 | 2 · 12 · loop | Aviso no chão onde o punho vai cair (jogo 40×6): marca vermelha piscando. |
| `punho-coluna` | 160×256 | 1 | Braço de sombra do Opressor, **emenda na vertical** (o jogo repete do teto até o chão). |
| `punho-mao` | 160×192 | 1 | O punho de **joinha** gigante na ponta de baixo da coluna. |
| `palavra-caixa-esq`, `-meio`, `-dir` | 32×72 · 16×72 · 32×72 | 1 cada | Caixa de fala **preta com borda vermelha** para as palavras do Grito de Fossa (jogo: altura 18). O jogo estica o `meio` e escreve a palavra por cima (OFENSA, BUEIRO, CRINGE, BAN, RATIO…). |
| `glitch-01..03` | 48×48 | 3 variações | Quadradinhos de glitch **verde/roxo** atirados em leque (jogo ~10 px). |
| `impacto-chefe-01..03` | 256×128 | 3 · 16 · 1× | Estouro de poeira grande nos pousos e socos. |
| `derrota-chefe-01..05` | 512×512 | 5 · 10 · 1× | Explosão final de chefe (luz branca + fumaça da cor da área). |

---

## 10. Objetos do mundo e coletáveis

Pasta `assets/cacada/objetos/` · contorno de **6 px**.

| Arquivo(s) | Arte · pivô | Jogo | Quadros · fps | Onde / o que é |
|---|---|---|---|---|
| `banco` | 160×96 · base linha 92 | 40×24 | 1 | **Banco de praça** de madeira com pés de ferro (checkpoint, como os bancos de HK). Um lampião pequeno ao lado pode estar no desenho. |
| `banco-ativo-01..02` | 160×96 | — | 2 · 4 · loop | Mesmo banco com **brilho amarelo quente** embaixo (quando está perto/salvou). |
| `placa` | 96×128 · base linha 124 | 24×32 | 1 | Placa de madeira num poste (dicas do tutorial). |
| `loja-barraca` | 320×256 · base linha 252 | 80×64 | 1 | Barraca do ItaloLOL: **toldo listrado vermelho e branco**, balcão azul, luzinhas. O ItaloLOL (6.2) é desenhado por cima, atrás do balcão. |
| `alavanca-01..03` | 64×96 · base linha 92 | 16×24 | 3 · 16 · 1× | Alavanca: 01 fechada (**vermelha**), 02 no meio, 03 aberta (**verde**). |
| `portao` | 80×80 | 1 tile | 1 | Grade de ferro do portão; **emenda na vertical** (o jogo empilha). |
| `portao-abrir-01..03` | 80×80 | — | 3 · 12 · 1× | Grade subindo para dentro do teto. |
| `grade-arena` | 80×80 | 1 tile | 2 · 8 · loop | Grade **roxa brilhante** que fecha a arena do chefe; emenda na vertical. |
| `parede-rachada-01..03` | 80×80 | 1 tile | 3 estados | Tijolos que **escondem segredos**: inteira com rachadura sutil, rachada, quase quebrando. **Uma versão por área** (`<area>/parede-rachada-01..03`, na cor da área). |
| `parede-quebrar-01..03` | 160×160 | — | 3 · 16 · 1× | Tijolos voando. |
| `bau-virgulas-01..03` | 96×96 · base linha 92 | 24×24 | 3 · 12 · 1× | Baú (caixa de feira) fechado, abrindo, aberto soltando vírgulas. |
| `virgula-01..04` | 32×32 | 8×8 | 4 · 10 · loop | A **vírgula** (a moeda, como o Geo): vírgula **dourada** `#ffd23f` girando. |
| `fragmento-01..02` | 96×96 · centro | 24×24 | 2 · 4 · loop | **Fragmento de cogumelo**: um quarto de cogumelo vermelho de bolinhas brancas, flutuando com brilho rosa. |
| `habilidade-orbe-01..04` | 128×128 · centro | 32×32 | 4 · 8 · loop | **Orbe dourado** das habilidades, com o símbolo da habilidade dentro (letra ou ícone pequeno). |
| `habilidade-pedestal` | 128×96 · base linha 92 | 32×24 | 1 | Pedestal de pedra onde o orbe fica. |

---

## 11. Perigos e plataformas

Pasta `assets/cacada/perigos/` · perigos seguem a regra do **vermelho/laranja quente** (1.4).

| Arquivo(s) | Arte | Jogo | Quadros · fps | O que é |
|---|---|---|---|---|
| `espinhos-chao` | 80×80 (espinhos na **metade de baixo**) | 1 tile | 1 | Fileira de pregos/cacos de vidro com pontas vermelhas. **Uma versão por área** é bem-vinda (`<area>/espinhos-chao`). |
| `espinhos-teto` | 80×80 (metade de cima) | 1 tile | 1 | Os mesmos, virados para baixo. |
| `serra-01..02` | 144×144 · centro | ~34 px (colisão: círculo de raio 15) | 2 (o jogo gira) | Serra circular de **12 dentes**, disco cinza com dentes **vermelhos**, parafuso no meio. |
| `trilho-horizontal`, `trilho-vertical` | 80×80 | 1 tile | 1 | Trilho escuro por onde a serra que vai e volta passa; emenda. |
| `plataforma-esq`, `-meio`, `-dir` | 80×32 cada | 20×8 por tile | 1 | **Plataforma móvel** de metal com rebites e faixa amarela; o jogo junta ponta esquerda + meios + ponta direita (largura em tiles varia). |
| `mola-01..03` | 80×80 · base linha 80 | 1 tile | 3 · 20 · 1× | **Mola vermelha** (01 parada, 02 comprimida, 03 esticada). |
| `telha-01..03` | 80×80 | 1 tile | 3 estados | **Telha de barro que desaba**: inteira, tremendo (rachada), quebrando. |
| `telha-cair-01..03` | 80×160 | — | 3 · 12 · 1× | Cacos caindo. |
| `marquise-esq`, `-meio`, `-dir` | 80×80 (tábua nos **24 px de cima**) | 1 tile | 1 | **Marquise** de madeira/toldo que dá para atravessar por baixo; emenda na horizontal. |

---

## 12. Tiles, decoração e fundos de cada área

Pasta `assets/cacada/areas/<area>/` · cores e temas na tabela 1.5 · **tiles 80×80 que emendam**.

### 12.1 Kit de tiles (gere este kit para CADA uma das 5 áreas)
| Arquivo | Onde vai |
|---|---|
| `topo` | Chão exposto em cima (onde se pisa): **faixa de 16–24 px na cor da área, com borda de cima clara** (`claro` da tabela 1.5). É a linha que o jogador lê como "dá para pisar". |
| `meio` | Parede/maciço por dentro (sem nada exposto). Textura bem discreta. |
| `teto` | Maciço com a parte de baixo exposta (tetos, sombra embaixo). |
| `lado-esq`, `lado-dir` | Parede com o lado esquerdo/direito exposto. |
| `canto-sup-esq`, `canto-sup-dir` | Quinas de cima (as **beiradas** que o Degustador agarra: deixe a quina bem legível). |
| `canto-inf-esq`, `canto-inf-dir` | Quinas de baixo. |
| `topo-variacao-01..02`, `meio-variacao-01..03` | Variações para quebrar a repetição (rachadura, planta, pichação pequena). |
| `caixa` | 80×80 · **caixa de metal** sólida (tile `X`), igual em todas as áreas (pode ficar só em `comum/`). |

### 12.2 Decoração (não colide; fica atrás do jogador)
4 a 8 peças por área, PNG transparente, com **contraste menor** que os tiles.

| Área | Peças sugeridas (tamanhos livres, múltiplos de 80) |
|---|---|
| Telhados | caixa d'água, antena de TV, varal com roupas, fios de poste, chaminé pequena, gato na sombra |
| Beco | cano de esgoto pingando, lixeira, pichação de vírgula, chaminé fumegando, placa de bar apagada |
| Fábrica | engrenagem grande, esteira, cano de vapor, painel de controle, tambor de óleo, lâmpada de gaiola |
| Torre | rack de servidor com LEDs, cabos pendurados, ventilador, monitor com código, luz de emergência |
| Covil | pilhas de notebooks, cabos pulsando verde, letras de chat flutuando, trono de cadeira gamer |

### 12.3 Fundos (paralaxe)
Cada área tem **3 camadas**, todas **2560×1440** e **emendando na horizontal** (e na vertical
nas áreas fechadas: beco, fábrica, torre). Baixo contraste, nada que pareça plataforma.

| Arquivo | Velocidade (paralaxe) | O que é |
|---|---|---|
| `fundo-1-ceu` | 0 (parado) | Céu/escuro de fundo, **opaco**, degradê suave com os 3 tons da área. |
| `fundo-2-longe` | 0,1–0,3 | Silhuetas distantes na névoa (cidade, chaminés, máquinas, racks). Transparente em cima. |
| `fundo-3-perto` | 0,35–0,5 | Estruturas mais próximas e mais escuras, com poucas luzes na cor da área. |
| `primeiro-plano` (opcional) | 1,2 | Silhuetas **bem escuras** passando na frente (fios, grades, folhas), só nas bordas de baixo e dos lados. |

Temas dos fundos:
| Área | Céu | Longe | Perto |
|---|---|---|---|
| Telhados | noite roxa com **lua** e o **batsinal de vírgula** projetado nas nuvens | cidade distante com janelas acesas | prédios e caixas d'água |
| Beco | escuridão avermelhada | paredes altas de tijolo, varais | chaminés, canos, janelas gradeadas |
| Fábrica | preto com brilho laranja embaixo (forno) | engrenagens gigantes paradas | canos, esteiras, vapor |
| Torre | azul-petróleo escuro | fileiras de racks de servidor | cabos, LEDs ciano e verdes piscando (gere também `leds-01..02` 2560×1440 transparente para piscar) |
| Covil | céu **corrompido** com faixas de glitch roxo/verde | cidade distante distorcida | pilhas de telas e letras de chat caindo |

---

## 13. Interface (HUD)

Pasta `assets/cacada/ui/` · contorno de **6 px** · tudo legível em cima de qualquer fundo.

| Arquivo(s) | Arte | Jogo | Quadros | Onde / o que é |
|---|---|---|---|---|
| `vaso-moldura` | 192×192 | ~48 px | 1 | O **vaso de Pontuação** (o "vaso de alma"), canto superior esquerdo: círculo com moldura branca-creme rachada e uma **vírgula** gravada. Centro vazio e transparente. |
| `vaso-liquido-01..04` | 160×160 (círculo) | ~40 px | 4 · 8 · loop | "Tinta" lilás-clara ondulando; o jogo recorta pela altura conforme a Pontuação. |
| `vaso-cheio-brilho` | 192×192 | — | 1 | Brilho quando dá para curar (≥ 33). |
| `cogumelo-cheio`, `cogumelo-vazio` | 64×64 | 16 px | 1 + 1 | Vida: cogumelo **vermelho de bolinhas brancas** (cheio) e só o contorno escurecido (vazio). |
| `cogumelo-perder-01..03` | 64×64 | — | 3 · 16 · 1× | Cogumelo estourando ao levar dano. |
| `cogumelo-ganhar-01..03` | 64×64 | — | 3 · 12 · 1× | Cogumelo enchendo ao curar. |
| `fragmentos-0..4` | 64×64 | 16 px | 5 | Contador de fragmentos: cogumelo dividido em 4, com 0 a 4 pedaços acesos. |
| `icone-virgulas` | 48×48 | 12 px | 1 | Vírgula dourada ao lado do número de vírgulas. |
| `barra-chefe-moldura`, `barra-chefe-enchimento` | 1600×64 · 1560×32 | 400×16 | 1 + 1 | Barra de vida do chefe (embaixo, no centro): moldura escura com enfeites nas pontas; enchimento vermelho. |
| `titulo-area-enfeite` | 1024×32 | 256×8 | 1 | Filete decorativo embaixo do nome da área quando se entra nela (como em HK). |
| `caixa-texto-esq`, `-meio`, `-dir` | 64×208 · 32×208 · 64×208 | altura 52 | 1 cada | Caixa das **placas** (texto embaixo da tela): fundo escuro translúcido, borda lilás. O jogo estica o meio. |
| `balao-fala-*` (9 partes: cantos 32×32, bordas 32×32, meio 32×32, rabinho 32×32) | — | — | 1 cada | Balão de fala do Inominável (6.3). |
| `seta-interagir-01..02` | 48×48 | 12 px | 2 · 4 · loop | Setinha amarela piscando sobre o banco/loja/placa ("aperte para cima"). |
| `salvo` | 128×32 | — | 1 | Selinho verde "salvo" (pode ter o texto). |

---

## 14. Telas e menus

Pasta `assets/cacada/telas/`.

| Arquivo(s) | Arte | Onde / o que é |
|---|---|---|
| `logo` | 2048×512 transparente | "**CAÇADA AO INOMINÁVEL**" em letras de gibi: "CAÇADA AO" branco, "INOMINÁVEL" **laranja** com contorno preto grosso e sombra roxa. É o único asset com texto grande. |
| `titulo-fundo` | 2560×1440 opaco | Tela de título: o **Degustador de costas** num telhado, capa ao vento, olhando a cidade roxa; ao longe, o **Inominável** e a sombra gigante do **Opressor** no céu. Deixe o **terço do meio livre** para o logo e os botões. |
| `titulo-fundo-camadas` (opcional) | 3 × 2560×1440 | Mesma cena em 3 camadas para paralaxe lenta. |
| `botao`, `botao-selecionado` | 1200×152 (9 partes se quiser) | Botões dos menus (título, pausa, final): fundo escuro `#2a2a3a`, borda escura; selecionado com **borda amarela** e fundo **laranja** no botão principal. |
| `pausa-fundo` | 2560×1440 translúcido | Véu roxo-escuro (80%) com vinheta. |
| `mapa-pergaminho` | 2560×1440 | Fundo do mapa: papel escuro/quadro de cortiça, bordas gastas. As salas são desenhadas por cima pelo jogo. |
| `mapa-icones` | 64×64 cada | `mapa-voce` (cabeça do Degustador), `mapa-banco`, `mapa-loja`, `mapa-chefe` (caveira), `mapa-sombra`, `mapa-habilidade`, `mapa-inominavel`. |
| `nova-habilidade-fundo` | 2560×1440 | Tela "NOVA HABILIDADE": raios dourados saindo do centro, escuro nas bordas. |
| `habilidade-rajada`, `-dash`, `-parede`, `-pulo2` | 1024×1024 | Ícones grandes das habilidades: MP5K cuspindo rajada; **Capa Janky** esvoaçando; **luvas com fita adesiva**; **parênteses ( )** brilhando. |
| `loja-fundo` | 2560×1440 | Tela da loja: dentro da barraca, balcão em primeiro plano, o retrato do ItaloLOL à esquerda. |
| `loja-fragmento`, `loja-lanche`, `loja-fita` | 256×256 | Ícones dos itens: fragmento de cogumelo; **Lanche Turbinado** (coxinha com raio); **Fita Reforçada** (rolo de fita prateada brilhando). |
| `morte-fundo` | 2560×1440 translúcido | "O DEGUSTADOR CAIU…": véu preto com fumaça roxa nas bordas. |
| `final-fundo` | 2560×1440 | "VOCÊ PEGOU O INOMINÁVEL!": o Degustador de pé, o Inominável sentado derrotado, vírgulas douradas caindo como confete. Espaço no centro para o texto das estatísticas. |

---

## 15. Controles de toque (opcional)

Pasta `assets/cacada/toque/` · hoje os botões são feitos em CSS; estas artes só deixam mais
bonito. PNG 256×256 (os botões grandes 384×256), cantos arredondados, fundo escuro
translúcido, ícone claro.

`seta-cima`, `seta-baixo`, `seta-esq`, `seta-dir`, `diagonal` (o jogo gira), `pular`, `golpe`,
`dash`, `rajada`, `cura`, `mapa`, `pausa` — cada um com versão `-apertado` (mais claro).

---

## 16. Checklist final e como trocar no código

### 16.1 Antes de entregar cada asset
- [ ] Tamanho exato de "Arte" e fator 4× respeitado.
- [ ] Fundo transparente limpo (sem halo), PNG 32 bits.
- [ ] Olhando para o lado certo (direita, salvo exceções).
- [ ] Pés/centro no pivô indicado; todos os quadros alinhados.
- [ ] Contorno `#120d1a` na espessura da categoria.
- [ ] Cores fixas do personagem iguais em todos os quadros; cores de código (1.4) respeitadas.
- [ ] Teste de leitura a 25% em cima do fundo da área.
- [ ] Nome do arquivo e pasta como na tabela.

### 16.2 Ordem sugerida de produção
1. Placa de estilo + folhas de modelo (Degustador, Inominável, chefes).
2. Degustador completo (seção 4) + efeitos dele (9.1).
3. Área **Telhados** inteira (tiles, decoração, fundo) + Capanga, Ping, Emoji, objetos e HUD.
4. As outras áreas, uma por vez, com os inimigos que aparecem nelas.
5. Chefes, telas e o resto.

### 16.3 Para quem for trocar no código
1. Salve os arquivos em `assets/cacada/...` como acima.
2. Em `js/cacada.js`, troque os caminhos da constante `ARQUIVOS` (hoje apontam para
   `assets/ronda/...`) e acrescente as chaves novas.
3. **Escala**: toda arte nova é 4×; desenhe com `ctx.drawImage(img, x, y, img.width / 4, img.height / 4)`
   (ou o tamanho de "Jogo" da tabela). No Degustador, troque o apoio `-76 * k, -123 * k` de
   `desenharJogador` pelo pivô novo (coluna 96, linha 184 de um quadro 192 → `-24, -46` no jogo).
   A feiticeira nova olha para a direita: tire `'feiticeira'` de `OLHA_ESQUERDA`.
4. O que hoje é desenhado por código fica em `DESENHOS` (inimigos), `TILES_AREA`/`TILES`
   (tiles), `desenharFundo` (fundos), `desenharCameos` (Inominável), `desenharLoja`,
   `desenharColetaveis`, `desenharGolpe`, `desenharProjeteis`, `desenharEfeitos` e `desenharHud`.
   Troque cada desenho por `ctx.drawImage` da arte nova, mantendo o mesmo tamanho na tela.
5. Os nomes das poses que o jogo já usa estão em `poseDoJogador()`; as animações novas
   (virar, frear, pousar, sentar…) podem ser ligadas aos mesmos estados aos poucos.
6. Rode `npm test` e abra o jogo (clique no título da página do Degustador) para conferir.
