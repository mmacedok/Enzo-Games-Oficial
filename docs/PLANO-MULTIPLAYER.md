# Batalha dos Torados: plano do multiplayer (jogador contra jogador)

> **Fica só no branch `TCG`** (ver `CLAUDE.md`). Escrito em 2026-09-26 a pedido do Henrique, com a
> condição: **tudo no Netlify grátis**. Regras do jogo em `docs/PLANO-TCG.md`.

## 0. Resumo em 5 linhas
1. A batalha é **por turnos**, então não precisa de conexão em tempo real: dá para fazer com o que o
   site já tem (**Netlify Functions + banco Neon/Netlify DB + login do Google**), sem serviço novo.
2. O **servidor é o juiz**: ele guarda a partida, roda o mesmo motor (`js/tcg-regras.js`) e só aceita
   jogadas válidas. Cada jogador só recebe o que pode ver (a mão do outro, o deck e a sorte ficam
   escondidos). Assim ninguém trapaceia mexendo no navegador.
3. Enquanto é a vez do outro, o navegador **pergunta ao servidor a cada 2,5 segundos** se teve jogada
   nova ("polling"). Na sua vez ele não pergunta nada. É barato e funciona bem para jogo de turno.
4. Primeiro jeito de jogar: **sala com código** (você cria, manda o link para um amigo, ele entra).
   Depois: desafiar pela Ficha pública e fila de "procurar partida".
5. Com os limites do plano grátis, uma partida gasta muito pouco (conta na seção 2), mas o site
   inteiro divide a mesma cota. Por isso o plano tem **freios** (limite de partidas por dia etc.).

## 1. O que o Netlify grátis permite (e o que não)
| | Pode? | Por quê importa |
|---|---|---|
| Páginas e imagens | sim | o site já é assim |
| Netlify Functions (a nossa `/api/*`) | sim | é onde o servidor da batalha vai morar |
| Banco Postgres (Neon / Netlify DB) | sim | já guarda login, recordes e o Baralho |
| **WebSocket** (conexão aberta, tempo real) | **não** | Functions respondem e fecham; nada fica ligado esperando |
| Tarefa rodando sozinha o tempo todo | não | por isso o relógio do turno é conferido quando alguém pergunta (seção 4) |

**Cota do plano grátis novo do Netlify (por créditos):** 300 créditos por mês, com **limite duro**:
quando acaba, **o site inteiro fica pausado** até o mês virar. Preços: 2 créditos a cada 10 mil
requisições, 10 créditos por GB-hora de Function e 20 créditos por GB de tráfego.
Contas antigas podem estar no plano grátis antigo (por quantidade de chamadas, não créditos).
**Henrique: confira no painel do Netlify, em Billing, qual é o seu** (e quanto o site já gasta por mês:
imagens dos gibis são o que mais pesa).

**Neon grátis:** 100 horas de computação por mês (o banco dorme sozinho depois de 5 minutos parado),
0,5 GB de espaço e 5 GB de tráfego. Suficiente para guardar milhares de partidas.

## 2. Quanto custa uma partida
Uma partida de uns 10 minutos, com uns 15 turnos de cada lado:
- **Jogadas**: ~30 chamadas (uma por ação que muda a mesa: baixar, Aura, atacar...). Umas 60 contando tudo.
- **Perguntas "teve jogada?"**: só na vez do outro, a cada 2,5 s. ~15 turnos × ~20 s = 5 min
  esperando → ~120 perguntas por jogador → ~240 no total.
- **Total**: ~300 chamadas de Function por partida.

Em créditos: 300 chamadas × ~0,15 s de Function = 45 s → ~0,125 crédito de computação, mais
~0,06 de requisições. **Cerca de 0,2 crédito por partida**: 100 partidas no mês ≈ 20 créditos.
Os números são estimativa; a fase M1 mede de verdade.

**Freios (para nunca pausar o site):**
- Parar de perguntar quando a aba está escondida ou o jogador ficou 2 minutos sem mexer;
  perguntar mais devagar (5 s) quando o outro está demorando.
- **Limite de partidas por dia** no site todo (começa em 50, configurável pelo admin) e de 10 por jogador.
- Máximo de **1 pergunta por segundo** por jogador (o servidor recusa o excesso).
- Tela do admin mostrando quantas partidas e chamadas teve no mês.

## 3. Como funciona (o caminho de uma jogada)
```
Navegador do Henrique                 Netlify Function /api/tcg            Banco (Neon)
  arrasta a Aura  ─── POST jogada ──▶  confere login e a vez
                                       carrega a partida  ◀────────────────  tcg_partidas
                                       motor: aplicar(estado, jogada)
                                       salva (só se ninguém mudou antes) ─▶  estado + versão + jogada
  anima os eventos ◀── visão dele ────
                                                                  
Navegador do amigo                                                          
  (a cada 2,5 s) ── GET teve jogada? ─▶ versão nova?  ── sim ──▶ manda só o que ele pode ver
  anima os eventos ◀──────────────────   (a mão do Henrique vira só um número)
```
- **O servidor sorteia tudo** (quem começa, moedas, compras) com a sorte guardada na partida. O
  navegador nunca vê a semente, então não dá para prever a moeda.
- **Duas jogadas ao mesmo tempo**: a partida tem um número de versão; o banco só salva se a versão
  ainda for a mesma que foi lida (`UPDATE ... WHERE versao = $2`). Se não for, responde "atualize".
- **Eventos com segredo** (a Câmera do Drone mostra a mão): o servidor guarda os eventos de cada
  jogada e manda para cada jogador só os dele (o motor já marca esses eventos como `privado`).
- **Mesma versão das regras**: o motor ganha um número de versão. Se o navegador estiver com uma
  versão velha, o servidor pede para recarregar a página em vez de jogar com regras diferentes.
- **Replay e conferência**: todas as jogadas ficam guardadas; o motor já sabe repetir uma partida
  inteira (`repetir`), então dá para conferir resultados e, no futuro, assistir partidas.

## 4. Regras de partida online
- **Login com Google obrigatório** para jogar online (já existe no site). Contra o NPC continua sem login.
- **Tempo de turno: 60 segundos.** Aviso no fim (últimos 10 s). Estourou: o servidor passa a vez
  sozinho. **3 estouros seguidos = derrota por abandono.** Como não há nada rodando sozinho no
  servidor, o relógio é conferido sempre que qualquer um dos dois pergunta ou joga.
- **Caiu a internet / fechou a aba**: a partida continua no servidor. Abrir `batalha.html` de novo
  (ou o link da sala) volta para a mesa exatamente onde estava.
- **Desistir**: botão 🏳️ de sempre.
- **Revanche**: no fim, "Jogar de novo" chama o mesmo amigo para outra sala.
- **Conversa só com reações prontas** (😂 👍 😱 "Boa jogada!" "Ops"), **sem chat de texto livre**:
  o público do site inclui crianças e não tem moderação de chat.
- **Deck**: por enquanto os 3 decks prontos (todas as cartas liberadas, decisão do Henrique). O
  servidor confere o deck com `validarDeck` do motor.

## 5. Onde e como encontrar alguém
1. **Sala com código (primeiro)**: botão "Outro jogador" → "Criar sala" mostra um código curto
   (ex. `TORA-7K2`) e um botão de copiar o link `batalha.html?sala=TORA-7K2`. Quem abre o link escolhe o
   deck e a partida começa. A sala some em 15 minutos se ninguém entrar.
2. **Desafiar pela Ficha pública** (depois): na ficha de outro leitor, botão "Desafiar"; ele recebe o
   aviso na próxima vez que abrir o site.
3. **Procurar partida** (por último): fila de espera de 60 s; se ninguém aparecer, oferece o NPC. Só
   vale a pena quando tiver bastante gente jogando.

## 6. Banco de dados (tabelas novas, em `api/schema.js`)
```
tcg_salas      codigo PK, criador, deck, criado_em, expira_em, partida_id
tcg_partidas   id PK, jogador_a, jogador_b, deck_a, deck_b,
               estado JSONB (completo, com a sorte: nunca sai do servidor),
               versao INT, regras INT (versão do motor), prazo BIGINT (fim do turno),
               estouros_a INT, estouros_b INT, status (jogando/fim), vencedor, motivo,
               criado_em, atualizado_em
tcg_jogadas    partida_id, n, jogador, jogada JSON, eventos JSON, criado_em   (PK partida_id + n)
tcg_resultados partida_id, vencedor, perdedor, decks, turnos, motivo, fim_em  (fica para sempre, pequeno)
```
Limpeza: jogadas e estado de partidas terminadas há mais de 7 dias são apagados (fica só o
resultado). Isso roda "de carona" quando alguém cria uma sala, sem tarefa agendada.

## 7. Rotas novas da API (`api/tcg.js`, no mesmo esquema das outras)
| Rota | Faz |
|---|---|
| `POST /api/tcg/salas` `{deck}` | cria sala, devolve `{codigo, link}` |
| `POST /api/tcg/salas/:codigo/entrar` `{deck}` | entra; o servidor cria a partida e sorteia quem começa |
| `GET /api/tcg/partidas/atual` | a partida em andamento do jogador (para voltar depois de recarregar) |
| `GET /api/tcg/partidas/:id?desde=<versão>` | "teve jogada?": se não, resposta mínima `{versao}`; se sim, a visão do jogador + eventos novos + prazo |
| `POST /api/tcg/partidas/:id/jogada` `{jogada, versao}` | aplica a jogada com o motor e devolve a visão + eventos |
| `POST /api/tcg/partidas/:id/reacao` `{reacao}` | manda uma reação pronta |

Tudo com o login (cookie) e a checagem de mesma origem que a API já faz.

## 8. O que muda no código que já existe
- **Motor** (`js/tcg-regras.js`): número de versão das regras; garantir que as funções que a tela usa
  (`jogadasValidas`, `motivoInvalida`) funcionam também com a **visão** do jogador (onde a mão do
  outro é só um número), porque online o navegador não tem o estado completo. Testes novos para isso.
- **Tela** (`js/batalha.js`): hoje ela chama o motor direto. Vira uma "mesa" com dois modos:
  **local** (NPC, como hoje) e **online** (manda a jogada para a API e anima os eventos que voltam).
  O desenho, as animações e o arrastar continuam iguais.
- **Robô**: nada muda (online são duas pessoas).
- **Artifact (o link de jogar)**: **não dá para jogar online nele**, porque o artifact não consegue
  falar com a API do site. Ele continua só contra o NPC. O online se testa no computador
  (`npm start`, duas janelas) e, depois, no site.

## 9. Fases
| Fase | Entrega | Como testa |
|---|---|---|
| **M0. Motor pronto para online** | versão das regras, motor funcionando com a visão, eventos filtrados por jogador | testes do motor |
| **M1. Servidor** | tabelas, `api/tcg.js`, salas, jogada, "teve jogada?", tempo de turno, abandono, freios | teste que joga uma partida inteira pela API com dois robôs (banco PGlite, como os testes de hoje), e mede chamadas por partida |
| **M2. Tela online** | "Outro jogador" liberado: criar sala, entrar pelo link, tela de espera, mesa online, relógio do turno, reconectar, revanche | Playwright com duas janelas no computador |
| **M3. Reações e acabamento** | reações prontas, avisos ("seu amigo entrou", "sua vez!"), título da aba piscando na sua vez | jogar de verdade |
| **M4. Desafio pela Ficha** | botão "Desafiar" na ficha pública e aviso para o desafiado | |
| **M5. Ranking e prêmios** | vitórias no perfil, conquistas, talvez créditos do Baralho com limite diário (era a fase 6) | |
| **M6. Procurar partida** | fila de espera | quando tiver público |
| *Opcional* | "campainha" em tempo real com um serviço grátis de mensagens (Ably ou Pusher) no lugar do polling | só se o polling ficar lento ou caro |

**Tudo isso fica no `TCG`**: o site no ar só ganha o multiplayer quando o Henrique liberar o Baralho
para o `main`. Até lá, o teste online é no computador.

## 10. Por que não outros caminhos
- **Conexão direta entre os dois navegadores (WebRTC)**: cada um teria a partida inteira, então daria
  para ver a mão do outro e trapacear; e ainda precisa de um servidor para os dois se acharem.
- **Servidor sempre ligado (Render, Fly, Railway...)**: os planos grátis dormem, têm limite de horas
  ou pedem cartão; e seria mais uma coisa para manter fora do Netlify.
- **Serviço de tempo real desde o começo**: mais uma conta, chave secreta e limite para vigiar. Fica
  como opcional, porque para jogo de turno o polling resolve.

## 11. Para decidir
1. **Começar pela sala com código?** Recomendo sim.
2. **Login obrigatório para jogar online?** Recomendo sim.
3. **Turno de 60 segundos, 3 estouros = derrota?** Recomendo sim.
4. **Só reações prontas, sem chat de texto?** Recomendo sim.
5. **Limite de 50 partidas por dia no site (ajustável)?** Recomendo sim, até medir o gasto real.

Fontes dos limites (consultadas em 2026-09-26): [Netlify, planos por créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/),
[Neon, planos](https://neon.com/docs/introduction/plans).
