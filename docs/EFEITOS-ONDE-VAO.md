# Efeitos da Batalha: para onde vai cada imagem

> **Fica só no branch `TCG`** (ver `CLAUDE.md`). Aqui estão só a pasta, o nome do arquivo e onde cada
> efeito aparece na tela. Os prompts, o estilo e os tamanhos estão em `docs/BATALHA-EFEITOS.md`.

## 1. A pasta
Todas as 40 imagens vão numa pasta só:

| Onde você está | Pasta |
|---|---|
| No computador (pasta `comic-reader`, branch `baralho`) | `comic-reader\assets\Batalha\efeitos\` |
| No GitHub / na nuvem (branch `TCG`) | `assets/Batalha/efeitos/` |

- Se a pasta `efeitos` não existir ainda, é só criar dentro de `assets\Batalha\`.
- **Nome exato da tabela**: tudo minúsculo, com hífen, sem acento, sem espaço e terminando em `.png`.
  Exemplo: `fx-almondega.png` (não `Almôndega.png` nem `fx almondega.png`).
- Se a imagem veio com outro nome (tipo `ChatGPT Image 26 set.png`), basta renomear.
- Imagem nova do mesmo efeito: salve por cima, com o mesmo nome.
- **Folha que veio em 4 quadros separados:** salve como `<nome>-1.png`, `<nome>-2.png`, `<nome>-3.png`
  e `<nome>-4.png` (ex. `fx-impacto-1.png` ... `fx-impacto-4.png`). O código aceita dos dois jeitos.
- **Não** coloque os efeitos soltos em `assets\Batalha\` nem em `assets\Cartas\`: lá o jogo não procura.

## 2. Cada arquivo, a carta e onde aparece
Tipo: **peça** = uma imagem parada (512×512, ou 256×256 onde diz); **folha** = 4 quadros lado a lado
(2048×512). Todas com fundo transparente.

### Leva 1: genéricos (todo ataque usa)
| Arquivo | Tipo | Onde aparece na tela |
|---|---|---|
| `fx-impacto.png` | folha | em cima da carta que levou o golpe, em todo ataque |
| `fx-poeira.png` | folha | embaixo da carta que caiu (nocaute), da carta entrando no banco e do campo chegando no meio da mesa |
| `fx-pow.png` | peça | letreiro por cima do impacto nos golpes de 50 ou mais (sorteado com o BAM) |
| `fx-bam.png` | peça | igual ao POW |
| `fx-ko.png` | peça | no meio da carta que caiu |
| `fx-cura.png` | peça | em cima da carta que se curou |
| `fx-estrela.png` | peça 256 | várias faíscas espalhadas em volta dos golpes |
| `fx-parentese.png` | peça | dos dois lados da carta que ganhou escudo (o código espelha) |

### Leva 2: lendários
| Arquivo | Tipo | Carta e ataque | Onde aparece na tela |
|---|---|---|---|
| `fx-almondega.png` | peça | Enzo Games, Almôndega | voa do Enzo até o alvo |
| `fx-molho.png` | peça | Enzo Games, Almôndega | mancha em cima do alvo, escorrendo |
| `fx-meteoro.png` | peça | Enzo Games, Macarronada a 300% | 5 caem do alto da tela em diagonal no alvo |
| `fx-explosao-macarronada.png` | folha | Enzo Games, Macarronada a 300% | onde cada meteoro cai |
| `fx-300.png` | peça | Enzo Games, Macarronada a 300% | no meio da tela, com a mesa escurecida |
| `fx-pasta-confidencial.png` | peça | Cabo Côco, Arquivo Confidencial | voa do Cabo Côco e abre em cima do alvo |
| `fx-tarja-censura.png` | peça | Cabo Côco, Arquivo Confidencial | 3 tarjas riscando a carta do alvo |
| `fx-virgula.png` | peça | Degustador da Noite, Vírgula-rangue | faz um arco do Degustador até o alvo e volta |
| `fx-bala-dourada.png` | peça | O Inominável, Bala Dourada | atravessa a mesa do Inominável até o alvo |
| `fx-balao-discord.png` | peça | O Inominável, poder Besteira no Discord | sai do Inominável e gruda no ativo do adversário |
| `fx-aura-coluna.png` | peça | Superkid, Farmar Aura e Aura de 67 Segundos | coluna em volta do Superkid |
| `fx-relogio.png` | peça | Superkid, Aura de 67 Segundos | atrás do Superkid, girando |

(O Escudo de Parênteses do Degustador usa o `fx-parentese.png` da leva 1.)

### Leva 3: épicos e raros
| Arquivo | Tipo | Carta e ataque | Onde aparece na tela |
|---|---|---|---|
| `fx-lagrima.png` | peça 256 | Chorão, Birra | leque de lágrimas do Chorão chovendo no alvo |
| `fx-processo.png` | peça | Chorão, poder Vou te Processar! | voa do Chorão de volta até quem atacou ele |
| `fx-cogumelo.png` | peça | Sombra do Degustador, Teemo no Top | brota no pé da carta do alvo |
| `fx-fumaca-roxa.png` | folha | Sombra do Degustador, Fumaça Roxa (e Teemo no Top, pintada de verde) | engolindo a carta do alvo |
| `fx-circulo-magico.png` | peça | Hatsune Neves, poder Invoco uma Carta de Magic | embaixo da Hatsune, e a carta sai dele para a mão |
| `fx-porta.png` | peça | Hatsune Neves, Porta do Quarto | batendo na cara do alvo |
| `fx-au.png` | peça | ItaloLOL, Au! Aura! | saindo da boca do ItaloLOL |
| `fx-kda.png` | peça | ItaloLOL, 0/14/2 | em cima do ItaloLOL |
| `fx-joinha.png` | peça | Stand do Joinha, Joinha (grande) e poder Num Tem Eu (pequeno) | grande: desce do alto e esmaga o alvo; pequeno: sai do banco e gruda no ativo |
| `fx-laco.png` | peça | Encantadora, Vem Cá, Meu Gadinho | sai da Encantadora, pega a carta do banco do adversário e puxa para o ativo |
| `fx-chama-rosa.png` | folha | Encantadora, Chama Rosa | subindo em cima do alvo |
| `fx-marreta.png` | peça | Marreteiro do Coração, Quebrar Tudo e Marretada | Quebrar Tudo: no campo do meio da mesa; Marretada: no alvo |
| `fx-rachadura.png` | folha | Marreteiro do Coração, Quebrar Tudo e Marretada | no chão embaixo de onde a marreta bateu |
| `fx-martelo-ban.png` | peça | Moderador do Discord, Ban de 7 Dias | desce em cima do alvo |
| `fx-carimbo-ban.png` | peça | Moderador do Discord, Ban de 7 Dias | carimbado na carta do alvo por um instante |

### Leva 4: comuns
| Arquivo | Tipo | Carta e ataque | Onde aparece na tela |
|---|---|---|---|
| `fx-soco-coracao.png` | peça | Cara de Coração, Soco Iludido | voa até o alvo (maior se a Encantadora estiver na mesa) |
| `fx-glitch.png` | folha | Bug do Discord, Glitch | piscando em cima do alvo (ou do próprio Bug, se der coroa) |
| `fx-notificacao.png` | peça 256 | Notificação Morcego, @everyone | várias em volta do alvo |
| `fx-emoji-bravo.png` | peça 256 | Emoji Pistola, Reação 😡 | chovendo no alvo, um por goon na sua mesa |
| `fx-facho.png` | peça | Drone Vigia, Facho | sai do drone, varre a mesa e para no alvo |

O poder Câmera do Drone Vigia não tem imagem: o flash é feito em código.

## 3. Depois de salvar
1. Rode `npm run build` na pasta `comic-reader`. Ele cria as versões menores em `assets\web\` e registra
   as imagens. Para conferir: `grep -c "assets/Batalha/efeitos/" js/images.generated.js` mostra quantas
   entraram.
2. Commit só destes caminhos e push no `TCG` (nunca no `main`):
   ```
   git add assets/Batalha/efeitos assets/web data/images.json js/images.generated.js css/images.generated.css
   git commit -m "Batalha: efeitos <quais>" -- assets/Batalha/efeitos assets/web data/images.json js/images.generated.js css/images.generated.css
   git push origin baralho:TCG
   ```
3. Avise na thread da Batalha dos Torados. O código dos efeitos é escrito em cima das imagens que
   chegarem. Dá para mandar por leva: a cada leva, os ataques que já têm imagem ganham o efeito, e o
   resto continua com os efeitos simples de hoje.

Prefere não mexer no git? Mande as imagens na thread (com qualquer nome) e o Claude segue
`docs/INSTRUCOES-ASSETS-CLAUDE.md` para pôr cada uma no lugar certo.
