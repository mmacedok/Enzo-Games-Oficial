# Batalha dos Torados — changelog

Cada entrada é uma versão de regras (`REGRAS_VERSAO` em `js/tcg-regras.js`). Partida online de versão antiga é
encerrada sem resultado; o jogador recarrega a página.

## Versão 12 — 2026-10-05 (cartas complementares, sem carta nova ainda)

Preparação do motor, da tela e do robô para as **cartas complementares** (tipo `resenha`, a "Zona de Resenha" do
`docs/PLANO-CARTAS-NOVAS.md`): cartas deitadas atrás de um lutador que mudam só ele. **Nenhuma carta existente mudou**:
400 partidas robô × robô deram exatamente os mesmos eventos antes e depois, e o simulador dá os mesmos números da v11.

| Parte | O que entrou |
|---|---|
| Jogada nova `anexar` | `{ tipo: 'anexar', uid: carta da mão, alvo: lutador na mesa }`. Na tela: arrastar a carta até o lutador, ou tocar nela → "Deitar atrás de um lutador" |
| Onde ela pode ir | `anexo.em`: lado (seu/dele/qualquer), só ativo ou só banco, tipos, cartas, tags. 1 por lutador (`ANEXOS_POR_LUTADOR`) |
| O que ela muda | HP, recuo, dano, redução de dano recebido, custo dos ataques, ataques a mais ou no lugar, efeitos a mais nos ataques, poder, tags e **aparência** (arte, nome e moldura de outra carta) |
| Quando age e quando sai | `aoEntrar` (efeitos ao deitar), `soAoEntrar` (age e vai para o descarte), `usos` (ataques), `turnos` (turnos de quem jogou). Sai junto com o lutador (nocaute ou devolvido ao baralho) e vai para o descarte de quem a jogou. Se ela dava HP, o lutador fica com 1 de vida em vez de cair |
| Para qualquer carta futura | `TIPOS`/`MODOS` (tipo de carta → jeito de jogar), `ficha()` (HP, ataques e poder de agora: toda regra, a tela e o robô leem daqui), `EFEITOS` e `BONUS_DANO` (efeito novo = uma entrada) |

## Versão 11 — 2026-10-04 (lista do Henrique, do Enzo e do deck do Inominável)

### Regras gerais
| Antes | Agora |
|---|---|
| 1 Aura presa por turno | **3 Auras por turno**, no máximo **2 na mesma carta** (a 3ª vai para outra carta) |
| Aura de Reforço (quem joga em 2º): +1 Aura só para o banco | Continua: +1 só para o banco, somada às 3 do turno (4 no total) |

Efeito no equilíbrio (simulador, 2.000 partidas, robô normal): partidas ficaram mais curtas (25,6 → 22,8 turnos), as que
terminam no limite de 30 turnos caíram de 28% para 12%, e quem começa vence 51,6% (antes 47,5%).

### Cartas que mudaram
| Carta | Antes | Agora |
|---|---|---|
| **Degustador da Noite** | Só o Vírgula-rangue deixava a carta virada (e derrubar uma carta) | O **Escudo de Parênteses também deixa virada** por 1 turno (corrige o "só vira quando mata") |
| **Moderador do Discord** | 2 cópias por deck | **1 cópia por deck** (as listas dos decks prontos foram ajustadas) |
| **Chorão** | Épico (nocaute tira 1.500 de vida) | **Raro** (nocaute tira 1.125 de vida) |
| **O Inominável** | Bala Dourada custava 3 Aura | **Custa 2 Aura** |
| **Drone Vigia** | Facho custava 1 Aura | **Facho de graça** (0 Aura) |
| **Notificação Morcego** | @everyone custava 1 Aura | **@everyone de graça** (0 Aura) |
| **Piscina de Macarronada** | Curava só o ativo de quem joga | Cura **todas as cartas de quem joga** (ativo e banco), ao ser jogada e no começo de cada turno |
| **Mansão do Inominável** | +400 de vida nos goons e Notificado tira 400; sair do campo podia derrubar goons | Mantém os dois efeitos. O HP extra dura **enquanto a Mansão estiver na mesa**; se ela sair, os goons perdem o extra **mas nunca caem por isso** (ficam com 1 de vida). **Novo:** goon que ataca com **1 Aura a mais** do que o ataque pede **notifica** o ativo do adversário |

### Motor, robô e testes
- `AURAS_POR_TURNO = 3` e `AURAS_MAX_POR_CARTA_NO_TURNO = 2` (exportados). O que cada carta já recebeu no turno fica em `flags.auraEm`.
- Cartas aceitam `maxCopias` em `js/tcg-cartas.js` (o Moderador usa 1); `validarDeck` respeita.
- Ataque com `custo: 0` é aceito (Facho e @everyone).
- O robô considera até +2 Auras do adversário ao medir a ameaça. O **Fácil** agora faz jogada ao acaso 60% das vezes (era 35%): com 3 Auras por turno,
  um erro custa menos e o Fácil ficava quase igual ao Normal.
- Testes atualizados (Aura, Reforço, Mansão, Chorão raro, custo 0, B14 do pó usa carta épica).

### Para conferir (o Henrique)
- As **cartilhas "Como jogar"** (`assets/Batalha/como-jogar-1.png` e `-2.png`) ainda dizem 1 Aura por turno: precisam ser refeitas (tarefa de imagem).
- Interpretações que eu tomei e que valem uma olhada: ver "Dúvidas" em `docs/PLANO-CARTAS-NOVAS.md`.

## Versão 10 — antes de 2026-10-04
- Banimento: cada jogador bane até 2 cartas não lendárias do deck do outro, **nunca as duas cópias da mesma carta**.
