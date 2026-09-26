# Batalha dos Torados: plano para completar (arte, decks e rivais)

> **Fica só no branch `TCG`** (ver `CLAUDE.md`). Escrito em 2026-09-26, depois que as 16 primeiras
> imagens (mesas, logo, NPC, aura, moedas, estados) entraram. Regras e números continuam em
> `docs/PLANO-TCG.md`; prompts das imagens já feitas em `docs/BATALHA-ASSETS.md`.

## A ideia que amarra tudo: o Torneio da Toradolândia
Hoje a Batalha é um menu solto: escolhe deck, escolhe "NPC fácil/normal", joga. A proposta é dar
uma história curta para tudo ter o mesmo lugar e a mesma cara:

> **O Torado montou um torneio de cartas na Toradolândia.** Você chega na entrada da arena, escolhe
> seu deck e sobe a escada de rivais. Cada rival é um personagem do Zezo Verso, com rosto, deck
> próprio, jeito de jogar e falas. No topo, o próprio Torado. Quem vence o Torado descobre um rival
> secreto... **???** (o Cabo Côco, sempre com a tarja "Conteúdo banido em 456 países").

Assim a arte nova (entrada da arena, mapa do torneio, rostos, caixas de deck, vitória e derrota)
conta a mesma história que as mesas e o logo já contam.

## 1. Rivais (os bots)
| # | Rival | Nível | Deck dele | Jeito de jogar |
|---|---|---|---|---|
| 1 | **ItaloLOL** | fácil | Bichos da Internet | joga tudo o que tem, erra bastante (é o tutorial) |
| 2 | **Hatsune Neves** | fácil | Turma do Enzo | protetora: cura e recua quem está mal |
| 3 | **Superkid** | normal | Heróis (novo) | agressivo: sempre o ataque mais forte, não recua |
| 4 | **Degustador da Noite** | normal | Noite do Degustador (novo) | espera juntar Aura e bate forte de uma vez |
| 5 | **O Inominável** | difícil | Legião do Mal | veneno e ban, joga para travar você |
| 6 | **Torado** (chefe) | difícil | Toradolândia (novo) | o melhor de cada estilo |
| ? | **???** (Cabo Côco, secreto) | difícil | Arquivo Confidencial (novo) | aparece só depois de vencer o Torado; rosto é a tarja |

Por dentro (`js/tcg-rivais.js` + `js/tcg-robo.js`):
- **Estilos**: cada rival dá pesos diferentes para as mesmas heurísticas do robô (dano, cura, recuo,
  estados, quantas cartas baixar). Um robô só, sete personalidades.
- **Nível difícil (novo)**: o robô testa cada jogada possível no próprio motor (que já é puro e
  determinístico), olha a melhor resposta do adversário e escolhe a que deixa a mesa melhor.
  Meta no simulador: difícil vence o normal em pelo menos 65% das partidas.
- **Falas**: cada rival tem 5 frases curtas (entrada, derrubou uma carta, perdeu uma carta, venceu,
  perdeu), em balão de gibi perto do rosto. Rascunho eu escrevo, o Henrique aprova.
- **Progresso**: a escada guarda quem você já venceu (no navegador por enquanto; na conta quando a
  fase do servidor chegar). Partida rápida continua existindo, com qualquer rival liberado.

## 2. Decks
**Seis decks prontos**, cada um com cara de um lugar ou turma (todos com 15 cartas, no máximo 2 de
cada e 1 lendário por nome, conferidos pelo motor e balanceados no simulador antes de entrar):

| Deck | Coração do deck | Estilo |
|---|---|---|
| Turma do Enzo (já existe) | Enzo Games, Superkid, Hatsune Neves | cura e compra |
| Legião do Mal (já existe) | O Inominável, Encantadora, Marreteiro | veneno e força bruta |
| Bichos da Internet (já existe) | Bug do Discord, Notificação Morcego, Drone | enxame de goons |
| Heróis (novo) | Superkid, Stand do Joinha, ItaloLOL, Piscina de Macarronada | ataque rápido |
| Noite do Degustador (novo) | Degustador, Sombra do Degustador, Estacionamento Noturno | Aura acumulada, golpes grandes |
| Toradolândia (novo, do chefe) | o melhor de cada estilo, Toradolândia de campo | equilibrado e forte |
| Arquivo Confidencial (secreto) | Cabo Côco, Moderador do Discord, Drone Vigia | controle: ban e espiar a mão |

**Montador de deck** (era a fase 4): aba "Meus decks" no menu da Batalha, com todas as cartas
liberadas (decisão do Henrique). Arrasta carta para o deck, o contador mostra 15/15, o motor avisa o
que está errado ("só 1 Enzo Games"), salva com nome. Os decks prontos aparecem como ponto de partida
("copiar e mudar").

## 3. Arte nova (para o Henrique gerar)
**Referência de estilo para TODAS:** anexe o `assets/Batalha/logo.png` e diga
*"use a imagem de referência como guia de estilo e cores"*, mais o bloco de estilo de gibi de
`docs/BATALHA-ASSETS.md`. Paleta: amarelo-ouro que vira laranja (#ffcc00 → #f58220), contorno preto
grosso, sombra dura vermelho-escura, roxo da Toradolândia (#2c1257) no fundo, faíscas e almôndegas
em chamas como marca registrada.

Salvar em `assets/Batalha/` com exatamente estes nomes (o Claude das instruções já sabe o caminho):

| Arquivo | Tamanho | O que é |
|---|---|---|
| `fundo-menu.png` | 1920×1080 | Entrada da arena da Toradolândia (fundo do menu) |
| `mapa-torneio.png` | 1536×1024 | A escada de rivais desenhada como um caminho com 7 paradas |
| `rival-italolol.png` | 512×512 | Rosto do ItaloLOL como rival |
| `rival-hatsune-neves.png` | 512×512 | Rosto da Hatsune Neves como rival |
| `rival-superkid.png` | 512×512 | Rosto do Superkid como rival |
| `rival-degustador-da-noite.png` | 512×512 | Rosto do Degustador como rival |
| `rival-o-inominavel.png` | 512×512 | Rosto do Inominável como rival |
| `caixa-turma.png`, `caixa-legiao.png`, `caixa-internet.png`, `caixa-herois.png`, `caixa-degustador.png`, `caixa-toradolandia.png` | 768×768, transparente | Caixa de baralho de cada deck (6 imagens) |
| `vitoria.png` e `derrota.png` | 1600×800, transparente | "VITÓRIA!" e "DERROTA..." no estilo do logo |

O Torado já tem rosto (`npc-torado.png`). O rival secreto **não tem imagem**: usa a tarja do Cabo Côco.

### Prompts
**`fundo-menu.png`**: `Entrada de uma arena de cartas subterrânea na Toradolândia vista de frente:
portão de pedra roxa com circuitos neon verde-água, faixa pendurada em branco (sem texto), holofotes
amarelos cruzando, arquibancada escura dos dois lados, fóssil de T-Rex na parede, moeda gigante de 1
centavo, almôndegas em chamas penduradas como tochas. Centro escuro e calmo (o menu fica por cima),
detalhes nas bordas, sem personagens, sem texto.` + bloco de estilo. Formato 16:9; o celular corta o
meio, então nada importante nos cantos.

**`mapa-torneio.png`**: `Mapa ilustrado visto de cima de um caminho em zigue-zague que sobe da base
até o topo de uma caverna roxa da Toradolândia, com 7 plataformas redondas vazias ao longo do
caminho (a primeira embaixo à esquerda, a sexta no topo com um trono, a sétima escondida atrás de uma
cortina com fita de cena de crime amarela), trilha de almôndegas marcando o caminho, sem personagens,
sem texto, estilo mapa de jogo.` + bloco de estilo. As plataformas precisam ser bem visíveis: o jogo
põe os rostos dos rivais em cima delas.

**Rostos dos rivais** (um por vez, com a ficha do personagem como referência, e diga *"mantenha
exatamente a aparência do personagem da imagem de referência"*):
`Retrato de busto de <PERSONAGEM> como rival de um torneio de cartas: <POSE>, segurando cartas em
leque, luz de holofote amarelo de cima e roxa de baixo, fundo roxo escuro liso com retícula,
enquadramento centralizado para recorte em círculo, sem texto.` + bloco de estilo.

| Rival | Referência | `<POSE>` |
|---|---|---|
| ItaloLOL | `assets/Personagens/Italolol.png` | rindo alto, apontando para quem olha |
| Hatsune Neves | `assets/Personagens/Hatsune Neves Ficha.png` | calma e confiante, uma carta brilhando na mão |
| Superkid | `assets/Personagens/Superkid Ficha.png` | pose de herói, capa ao vento, punho fechado |
| Degustador da Noite | `assets/Personagens/Degustador da noite Ficha.png` | sério, meio na sombra, olhos brilhando |
| O Inominável | `assets/Personagens/O Inominavel Ficha.png` | sorriso sinistro, cartas pegando fogo roxo |

**Caixas de deck**: `Caixa de papelão de baralho de cartas em pé, vista de 3/4, com a ilustração de
<TEMA> na frente, cantos gastos, uma almôndega em chamas como selo no canto, contorno preto grosso de
gibi, fundo transparente, sem texto.` + bloco de estilo.

| Arquivo | `<TEMA>` |
|---|---|
| `caixa-turma` | Enzo Games de braços cruzados com a turma atrás, laranja e amarelo (ref.: carta do Enzo Games) |
| `caixa-legiao` | O Inominável com a Encantadora e o Marreteiro nas sombras, roxo e verde |
| `caixa-internet` | enxame de Bugs, Morcegos-notificação e Drones saindo de um monitor, azul e ciano |
| `caixa-herois` | Superkid voando sobre uma piscina de macarronada, vermelho e azul |
| `caixa-degustador` | Degustador da Noite sob a lua num estacionamento, azul-escuro e dourado |
| `caixa-toradolandia` | o Torado sentado num trono com a caverna roxa atrás, roxo e verde-água |

**`vitoria.png` e `derrota.png`** (aqui o texto é obrigatório, como no logo):
`Letreiro "VITÓRIA!" no mesmo estilo do logo de referência: letras de gibi grossas e inclinadas,
amarelo que vira laranja, contorno preto grosso, sombra dura, explosão de confete e almôndegas em
chamas atrás, fundo transparente, texto escrito exatamente assim, em português.`
Para a derrota: `"DERROTA..."`, as mesmas letras em cinza e azul apagados, rachadas, com uma
almôndega murcha e fumaça em vez de fogo. Confira a grafia (o acento de VITÓRIA).

### Depois (junto com a fase dos efeitos)
Os efeitos por ataque (4 a 6 quadros cada) já listados no fim de `docs/BATALHA-ASSETS.md`.

## 4. Ordem de trabalho
| Etapa | O que eu faço (código) | O que o Henrique faz |
|---|---|---|
| A. **Rivais e torneio** | `tcg-rivais.js` (7 rivais), estilos e nível difícil no robô, falas em balão, tela do torneio com a escada, progresso salvo; simulador confere que difícil > normal > fácil | aprovar a lista de rivais e as falas |
| B. **Decks** | 4 decks novos balanceados no simulador + montador "Meus decks" | aprovar os decks |
| C. **Arte nova no lugar** | menu com fundo da arena, caixas de deck no lugar dos leques, mapa do torneio, vitória e derrota com arte; tudo com placeholder até a imagem existir | gerar as 15 imagens da seção 3 |
| D. **Tutorial** | 1ª luta guiada contra o ItaloLOL, passo a passo (arrastar, Aura, atacar, recuar) | jogar e dizer o que confundiu |
| E. **Efeitos por ataque** | animação própria para cada ataque | gerar os quadros dos efeitos |
| depois | servidor e prêmios, contra outro jogador | |

A e B não dependem de imagem: dá para começar já, com placeholders. O link de jogar é atualizado a
cada etapa.

## 5. Para decidir
1. **Torneio com escada de rivais?** Recomendo sim (é o que amarra arte, decks e bots).
2. **Os 7 rivais da tabela?** Recomendo sim; dá para trocar qualquer um depois.
3. **Cabo Côco como rival secreto, com a tarja no rosto?** Recomendo sim.
4. **Decks montados salvos só no navegador por enquanto?** Recomendo sim; vão para a conta na fase do servidor.
