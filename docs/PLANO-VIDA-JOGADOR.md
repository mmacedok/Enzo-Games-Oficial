# Plano: vitória por dano (vida do jogador) e cartas viradas (recarga)

Status: **plano, nada implementado** (2026-09-30). Pedido do Henrique:
- não se vence mais por cartas destruídas, e sim pelo **dano causado**;
- cada jogador tem **vida** (algo como 6 mil);
- um ataque pode ir no **jogador** ou na **carta ativa**;
- vida e dano das cartas crescem na mesma proporção;
- copiar o **cooldown do Moderador**: carta que usou efeito forte fica **virada para baixo**, com a
  **arte da capa da Batalha** no verso.

Levantamento do sistema atual: DeepSeek, 2026-09-30, todas as provas conferidas. Resumo na seção 1.

---

## 1. Como é hoje (o que muda)
| Hoje | Onde | Depois |
|---|---|---|
| Vence com **3 pontos** (1 por nocaute) ou deixando o rival sem mesa | `js/tcg-regras.js:34, 49, 354-376` | vence quem zerar a **vida** do outro |
| Limite de 30 turnos: vence quem tem mais pontos | `tcg-regras.js:420` | vence quem tem **mais vida** |
| Ataque só acerta o ativo (salvo alvo `qualquer`) | `tcg-regras.js:291-294, 434` | escolhe entre o **ativo** e o **jogador** |
| Estado do jogador tem `pontos`, não tem vida | `tcg-regras.js:130` | ganha `vida` (e `vidaMax`) |
| HP 40 a 140, dano 0 a 120, efeitos de 10 a 30 | `js/tcg-cartas.js:25-110` | tudo **×20** (seção 2) |
| Silenciado com imunidade logo depois (anti-trava) | `tcg-regras.js:102, 164, 470` | vira o modelo da **recarga** |
| Verso da carta em CSS laranja, sem arte | `js/baralho.js:183`, `css/style.css:2784` | verso da Batalha com o `logo.png` |
| Robô prioriza nocaute | `js/tcg-robo.js:72` | pesa o golpe no jogador contra limpar a mesa |

Números de hoje (simulador, 200 partidas): 17,2 turnos em média, quem começa vence 52,3%,
96,5% acabam por pontos.

## 2. A escala: por que ×20 e 6.000 de vida
A ideia é **não mudar o ritmo do jogo**, só o placar.
- Hoje se vence derrubando 3 cartas. A carta média de luta tem 95 de HP, então vencer custa uns
  285 de dano. Com **×20**, isso dá 5.700, perto dos **6.000** que o Henrique sugeriu.
- **HP e dano sobem juntos (×20).** Uma carta continua morrendo com o mesmo número de golpes de antes.
  Então o equilíbrio entre as cartas, já testado, não se perde.
- **Números fixos de efeito também ×20:**
  - Notificado: 10 → 200 (Mansão: 20 → 400);
  - Iludido: 20 → 400;
  - escudos: 30 → 600 e 20 → 400;
  - curas: 20 → 400;
  - contra-ataque do Chorão, bônus do Stand, da Encantadora, por goon e por Aura: 10 → 200 e 20 → 400;
  - Bug do Discord: 40 → 800;
  - HP extra de goon na Mansão: 20 → 400.
- **Custos de Aura, recuo e cartas na mão não mudam.**

Tabela inicial (só multiplicar; a calibragem da seção 5 ajusta):

| Carta | HP hoje → novo | Ataques (dano hoje → novo) |
|---|---|---|
| Enzo Games | 140 → 2800 | Almôndega 30 → 600 · Macarronada a 300% 120 → 2400 |
| Cabo Côco | 130 → 2600 | Arquivo Confidencial 60 → 1200 (cura 400) |
| Degustador da Noite | 130 → 2600 | Vírgula-rangue 20 → 400 · Escudo de Parênteses 90 → 1800 (escudo 600) |
| O Inominável | 120 → 2400 | Bala Dourada 60 → 1200 |
| Superkid | 130 → 2600 | Farmar Aura 0 · Aura de 67 Segundos 20 → 400 (+400 por Aura) |
| Chorão | 110 → 2200 | Birra 50 → 1000 (contra-ataque 400) |
| Sombra do Degustador | 90 → 1800 | Teemo no Top 20 → 400 · Fumaça Roxa 50 → 1000 |
| Hatsune Neves | 80 → 1600 | Porta do Quarto 30 → 600 (escudo 400) |
| ItaloLOL | 90 → 1800 | Au! Aura! 20 → 400 · 0/14/2 70 → 1400 (leva 600) |
| Stand do Joinha | 70 → 1400 | Joinha 20 → 400 (+200 do banco) |
| Encantadora | 70 → 1400 | Vem Cá 0 · Chama Rosa 30 → 600 |
| Marreteiro do Coração | 100 → 2000 | Quebrar Tudo 0 · Marretada 90 → 1800 |
| Moderador do Discord | 90 → 1800 | Ban de 7 Dias 30 → 600 |
| Cara de Coração | 70 → 1400 | Soco Iludido 20 → 400 (+400 com Encantadora) |
| Bug do Discord | 50 → 1000 | Glitch 0 / 800 na moeda |
| Notificação Morcego | 40 → 800 | @everyone 10 → 200 |
| Emoji Pistola | 60 → 1200 | Reação 😡 10 → 200 (+200 por goon) |
| Drone Vigia | 60 → 1200 | Facho 20 → 400 |

**Como fazer no código:** um `ESCALA = 20` em `js/tcg-regras.js`, aplicado ao ler a carta
(`hpMax`, dano, efeitos). Os números de `js/tcg-cartas.js` continuam pequenos e legíveis, e a
calibragem ajusta uma constante em vez de 60 números. As exceções da calibragem (ex.: "Marretada
1700") ficam num campo próprio da carta.

## 3. Regras novas
### 3.1 Vida e vitória
- Cada jogador começa com **6.000** (`VIDA_INICIAL`, ajustável). Aparece no placar da mesa, no lugar
  das bolinhas de pontos, como barra e número.
- **Vence quem zerar a vida do outro.** Desistência e inatividade continuam iguais.
- **Limite de 30 turnos:** vence quem tem mais vida; se igual, empate.
- **Mesa vazia não é mais derrota.** Sem ativo, o jogador escolhe do banco (já é assim). Se não tem
  ninguém nem na mão, só passa e fica exposto: todo ataque vai direto nele.

### 3.2 Atacar o jogador ou o ativo
- Ao atacar, o dono escolhe o alvo: **o ativo do rival** ou **o rival** (arrastar até o rosto
  dele no placar).
- Os ataques com alvo `qualquer` (Degustador e Inominável) seguem podendo acertar o banco.
- **Nocaute também fere o dono** (substitui os pontos): quando uma carta cai, o dono perde vida
  conforme a raridade. Sugestão: comum 500, raro 750, épico 1.000, lendário 1.500. Sem isso, ninguém
  teria motivo para derrubar cartas: todo mundo iria só no rosto.
- **Decidido (Henrique, 2026-09-30):** por enquanto dá para **acertar o jogador sempre**, mesmo com
  o ativo dele na mesa. **Depois**, algumas cartas vão poder **entrar no meio** (interceptar o golpe
  no jogador). Fica para uma etapa futura: deixar no motor um ponto de gancho (`interceptar`) para
  não refazer a regra.

### 3.3 Recarga: a carta vira para baixo (modelo do Moderador)
Hoje o Silenciado grava "vale até o turno X" e dá imunidade logo depois (`tcg-regras.js:164, 470`).
A recarga usa o mesmo formato, só que no **próprio atacante**:
- **Cada ataque ganha `recarga` (em turnos do dono).** Depois de usar um ataque com recarga, a carta
  fica **virada** até o turno `estado.turno + 2 × recarga`. O campo novo é
  `inst.estados.virada = turnoFinal`, contado igual ao `silenciado`.
- **Virada:**
  - não ataca, não usa poder e não recua;
  - **continua na mesa e pode levar golpe**;
  - o HP fica visível num selo por cima do verso;
  - ao voltar a ficar de frente, uma animação vira a carta.
- **Decidido (Henrique, 2026-09-30): recarga 1** em só quatro ataques:
  - **Ban de 7 Dias** (Moderador do Discord, o que silencia);
  - **Macarronada a 300%** (Enzo Games);
  - **Vírgula-rangue** (Degustador da Noite);
  - **Bala Dourada** (O Inominável).

  Todos os outros ficam com recarga 0. Atacar o jogador **não vira a carta por si só**: só esses
  quatro ataques viram, e viram em qualquer alvo (carta ou jogador).
- **Verso da Batalha:** a carta virada e a mão escondida do rival usam o verso novo: fundo escuro
  com o `assets/Batalha/logo.png` (a capa) no meio, pelo `UI.verso` com uma variante
  `carta-tcg--verso-batalha`. O `logo.png` é horizontal (1600×800), então no começo é CSS. Se o
  Henrique quiser uma arte vertical própria, vai uma tarefa para o Codex (seção 6).

### 3.4 Robô (NPC)
- O `danoPrevisto` de `js/tcg-robo.js:31` passa a conhecer o alvo "jogador".
- Ordem nova:
  1. vitória agora (dano ≥ vida do rival);
  2. nocaute que evita a derrota dele no próximo turno;
  3. golpe no jogador quando o ativo rival não ameaça;
  4. senão, a jogada de maior nota.
- A carta com recarga pesa o custo de ficar virada.
- Os três níveis (fácil, normal, difícil) continuam.

## 4. Onde muda no código
| Parte | Arquivos |
|---|---|
| Motor (fonte única) | `js/tcg-regras.js`: `ESCALA`, `VIDA_INICIAL`, `DANO_NOCAUTE`, `vida` no jogador, alvo "jogador", `verificarNocautes` sem pontos, fim por vida, limite por vida, `virada`/recarga, `jogadasValidas` |
| Cartas | `js/tcg-cartas.js`: campo `recarga` nos ataques (e exceções de calibragem) |
| Robô | `js/tcg-robo.js` |
| Online | `api/tcg.js`: versão da regra no estado salvo (partida antiga termina na regra antiga ou é encerrada) |
| Tela | `js/batalha.js`: barra de vida no placar, zona de soltar no rosto do rival, números grandes formatados (2.400), carta virada, "Como jogar" · `css/batalha.css` |
| Verso | `js/baralho.js` (`verso`), `css/style.css` ou `css/batalha.css` |
| Testes | `test/tcg-regras.test.js` (vitória por pontos em 218, 242, 301 vira vitória por vida; testes novos de alvo jogador, nocaute que fere, recarga/virada), `test/tcg-online.test.js` |
| Simulador | `tools/tcg-simular.mjs`: medir vida restante, % de golpes no rosto, recargas usadas |
| Docs | `docs/PLANO-TCG.md` (tirar os "2 pontos do lendário", que já não valiam), regras no "Como jogar" |

## 5. Calibragem (como saber que ficou equilibrado)
Rodar o simulador com várias combinações e escolher a que bate as metas:
- **Grade:**
  - `VIDA_INICIAL` 5.000 / 6.000 / 7.000;
  - `DANO_NOCAUTE` (0, a tabela sugerida, e 1,5× ela);
  - níveis do robô normal×normal e difícil×difícil;
  - 2.000 partidas por combinação.
- **Metas:**
  - 16 a 22 turnos em média (hoje 17,2);
  - quem começa vence entre 48% e 55%;
  - menos de 3% por limite de turnos;
  - de 35% a 70% dos golpes no jogador (nem só rosto, nem só mesa);
  - nenhuma carta com taxa de vitória fora de 40–60% (ajustar só essas, com exceções na carta).
- **Resultado:** uma tabela final para o Henrique aprovar antes de ligar no site.

## 6. Quem faz o quê (delegação)
Regra geral: **Claude** decide e mexe no motor (regra e placar são lógica sensível e o online
depende disso). O **DeepSeek (OpenRouter)** faz o mecânico numa worktree. O **Gemini** roda o
simulador, testa telas e escreve docs. O **Codex** faz arte. O **Jev** confere o relatório do Gemini.

| # | Etapa | Quem | Como | Pronto quando |
|---|---|---|---|---|
| 0 | Decisões A e B ✔ (2026-09-30); escala ×20 e 6.000 seguem como ponto de partida da calibragem | **Henrique** | respondeu no chat | — |
| 1 | Motor: `ESCALA`, vida, alvo jogador, nocaute que fere, recarga/virada, fim por vida, robô | **Claude** | worktree do `TCG` | `node --test test/tcg-regras.test.js` passa com os testes novos |
| 2 | Atualizar os testes antigos de pontos + escrever os testes novos pela lista da 3.1 a 3.3 | **DeepSeek** (`--escrever`, worktree) | tarefa com a lista exata dos casos | Claude revisa o diff; suíte passa |
| 3 | Simulador com as métricas novas + grade da seção 5 | **Gemini** (tarefa na ponte) | `tools/tcg-simular.mjs` numa cópia fixa, relatório com tabela por combinação | `verificar.mjs` do Jev sem CONTRADIZ; Claude escolhe a combinação e o Henrique aprova |
| 4 | Tela: barra de vida, soltar no rosto, carta virada, verso com o logo, números formatados, "Como jogar" | **DeepSeek** (`--escrever`) nas partes mecânicas; **Claude** na zona de alvo e na animação de virar | worktree; arquivos separados por agente | Claude confere no navegador (computador e celular) |
| 5 | Online (`api/tcg.js`): versão da regra, partidas em andamento | **Claude** | — | `test/tcg-online.test.js` passa |
| 6 | QA: partidas inteiras contra os 3 robôs e online entre 2 abas, computador e celular (iPhone no modo do Safari) | **Gemini** (`/teamwork-preview`, capturas) | cópia fixa + servidor com login falso | relatório conferido pelo Jev; Claude lê só os problemas |
| 7 | (Opcional) verso vertical próprio: arte da capa em pé, 630×880 | **Codex** (ponte, `tarefas/02-verso-batalha.md`) | manifesto com destino `assets/Batalha/verso-carta.png` | `conferir.cjs` OK; troca o CSS pela imagem |
| 8 | Docs (`PLANO-TCG.md`, `PENDENCIAS.md`, regras) | **Gemini** | — | Claude confere |
| 9 | Commit e push no `TCG`; `main` só quando o Henrique pedir | **Claude** | — | — |

Ordem: 0 → 1 → (2 e 3 em paralelo) → escolher os números → 4 e 5 → 6 → 8 → 9. A 7 corre em paralelo
a qualquer momento.

## 7. Riscos
- **Partidas online em andamento** quando a regra mudar: o estado salvo não tem `vida`. O servidor
  precisa reconhecer a versão e encerrar ou terminar a partida na regra velha.
- **Números grandes na tela do celular:** "2.400" ocupa mais que "120". O selo de HP já é
  proporcional à carta (`cqi`), mas precisa de conferência no iPhone.
- **Jogo só de "rosto":** se as metas da seção 5 não fecharem, as alavancas são o `DANO_NOCAUTE`
  maior e, mais adiante, as cartas que entram no meio.
