# Plano: Baralho Enzo — pacotes de cartas colecionáveis (TCG)

Status (2026-09-24): **fases 1–4 implementadas** (servidor, aba Baralho, abertura, +créditos e ficha pública).
Falta: testes do servidor e comandos do terminal (Gemini, tarefa 19), QA de tela e calibração (tarefa 20),
fase 6 (campos e goons).

Mudança pedida pelo Henrique durante a construção: **pacote e abertura no estilo do Balatro** — pacote
serrilhado com leque de cartas na capa, fundo de tinta rodando (WebGL pixelado, nas `cores` do pacote),
tudo balança e inclina com mola, o pacote aperta e estoura em confete, as cartas são distribuídas com mola.
Este arquivo se sustenta sozinho: o chat vai ser limpo, então tudo o que é preciso para construir está aqui.

## Contexto
Henrique quer um minigame de abrir pacotes de cartas, estilo TCG, no site.
- Cada personagem já publicado vira uma carta.
- Cada carta tem uma raridade — comum, raro, épico ou lendário — que define a chance de sair e a aparência:
  - comum e raro mudam só a cor da carta;
  - épico tem foil (brilho holográfico);
  - lendário é dourado e reluzente.
- Depois entram as cartas "filler": campos (lugares) e goons (os caras de coração, a Encantadora...).

Decisões do Henrique:
1. **3 tipos de pacote**, comprados com **créditos**. Os créditos vêm dos minigames: a pontuação de cada partida verificada entra na conta como créditos. **Sem limite diário de créditos.**
2. **Inventário na Ficha do Leitor.**
   - A pessoa escolhe um pacote no inventário e clica em "Abrir".
   - A Ficha fecha, o fundo escurece e a animação de abrir o pacote ocupa a tela inteira.
   - Com mais de um pacote, aparece a opção de abrir vários.
3. **Repetidas NÃO viram pó sozinhas.** A carta repetida entra na coleção (x2, x3...). No inventário, a pessoa escolhe **transformar as repetidas em "pó de estrela"**, e o pó também compra pacotes.
4. **Só com login.** O sorteio é feito no servidor e a coleção fica salva na conta.

Nome do recurso: **"Baralho Enzo"**. No código, `baralho`, para não confundir com as "Cartas dos Leitores" (os comentários, `comentarios`).

## Onde as coisas estão (para quem chega sem o chat)
- **Site:** `E:\AI Workshop\Enzo Games\Enzo Games SITE\comic-reader`.
  - Repositório GitHub `mmacedok/Enzo-Games-Oficial`, branch `main`; o deploy no Netlify é automático no push.
  - **Push só quando o Henrique pedir.** Commits locais podem.
  - Faça commit com `git commit -- <arquivos>`: há mudanças de OUTRA conversa em `animacao/`, que não se toca.
- **API:** `api/` (Request → Response), usada pelo `server.js` localmente (PGlite) e pela Netlify Function (`netlify/functions-src/api.mjs`, empacotada por `tools/build-function.mjs`). O esquema do banco está em `api/schema.js` (só `IF NOT EXISTS`).
- **Rotas:** cada arquivo exporta `rotas` (`{ metodo, caminho, login?, admin?, executar(ctx) }`) e o `api/handler.js` junta tudo.
  - Admin = e-mail em `ADMIN_EMAILS` (`api/admin.js` → `ehAdmin`).
  - Ações de admin gravam em `admin_log`.
- **Padrões a copiar:**
  - `js/conquistas.js`: dados UMD usados pelo site e pelo servidor;
  - `api/admin.js` e `api/comentarios.js`: rotas, validação, `registrar()` no log;
  - `test/admin.test.js` e `test/comentarios.test.js`: `montar()`/`navegador()` com Google falso e relógio controlado.
- **Ficha do Leitor:** `js/auth-widget.js`.
  - `mostrarVista` monta as abas "Minha ficha" e "Leitores do site".
  - `window.EnzoConta` expõe usuario, admin, avatar, abrirFicha, pedirLogin, conquista, enviarPartida...
- **Jogos:** `js/game-dialog.js` (`janela.enviarPartida`), `js/flappy.js`, `js/ronda.js`. Os pontos são validados por `api/anti-cheat.js` em `api/games.js` (`submit`).
- **Efeito holográfico** que já existe: `.book-foil` + variáveis `--mx/--my`, em `js/shelf.js` e `css/style.css`.
- **Terminal admin:** `admin.html` + `js/admin.js` (comandos em `COMANDOS`).
- **Imagens:** `lib/web-images.js` / `js/images.generated.js` / `siteIcon()` em `js/site.js`. As fichas dos personagens ficam em `assets/Personagens/*.png`.
- **Depois de mudar `api/` ou `js/*-dados.js`:** reinicie o servidor local (`npm run serve`). Servidor velho recusa ids novos.
- **Cache-bust:** suba o `?v=` dos scripts e do `style.css` nas páginas `*.html` que mudaram.

## Cartas (dados em `js/baralho-dados.js`, UMD igual a `js/conquistas.js`)
Formato de cada carta: `{ id, numero, nome, tipo: 'personagem'|'campo'|'goon', raridade, peso, arte, foco, frase }`.
- `arte`: a ficha em `assets/Personagens/`, pelo pipeline de imagens web (não baixa o PNG de 7 MB).
- `foco`: o `object-position` do recorte.

Raridades iniciais. **São sugestão; o Henrique ajusta:**

| Carta | Raridade | Ficha |
|---|---|---|
| Enzo Games | Lendário | `Enzo games ficha.png` |
| Cabo Côco (a ficha "banida") | Lendário | `Cabo Côco.png` |
| Degustador da Noite | Épico | `Degustador da noite Ficha.png` |
| O Inominável | Épico | `O Inominavel Ficha.png` |
| Hatsune Neves | Raro | `Hatsune Neves Ficha.png` |
| Superkid | Raro | `Superkid Ficha.png` |
| ItaloLOL | Comum | `Italolol.png` |

Fase 2: campos (Toradolândia, Estacionamento, Piscina de Macarronada...) e goons (caras de coração, Encantadora, Chorão, Stand do Joinha...), principalmente no comum e no raro. A bíblia do universo está em `E:\Henrique V0\Vault V0\Henrique\Enzo Games.md`.

**Sorteio de cada carta:**
1. Primeiro sorteia a raridade pelas chances do pacote.
2. Depois sorteia a carta dentro da raridade, pelo `peso`.

Se uma raridade estiver vazia, o sorteio desce para a de baixo. O servidor usa `crypto.randomInt`, e o sorteador é injetável nos testes (opção em `createApi`, como o `verificarGoogle`).

## Pacotes (em `js/baralho-dados.js`; preços e chances ajustáveis)

| Pacote | Preço | Cartas | Chances por carta (C/R/E/L) | Garantia |
|---|---|---|---|---|
| **Pacote do Estacionamento** | 100 créditos (ou 60 pó) | 3 | 72 / 22 / 5 / 1 | — |
| **Pacote da Toradolândia** | 300 créditos | 5 | 60 / 28 / 10 / 2 | 1 raro ou melhor |
| **Pacote da Piscina de Macarronada** | 900 créditos | 5 | 40 / 35 / 19 / 6 | 1 épico ou melhor |

**Créditos:** toda partida **verificada** credita:
- Flappy: `pontos × 10`;
- Degustação Noturna: `pontos × 1`.

Os fatores são calibrados com dados reais: uma tarefa para o Gemini mede os pontos por minuto com o robô. O alvo é **uns 5 minutos de jogo por Pacote do Estacionamento**. **Sem limite diário.** Bônus de boas-vindas: 1 Pacote do Estacionamento no primeiro acesso ao Baralho.

**Pó de estrela (manual):**
- no fichário, cada carta com `qtd > 1` mostra "Transformar repetidas";
- a pessoa escolhe quantas, sempre mantendo 1;
- há também o botão "Transformar todas as repetidas", com confirmação mostrando o total de pó;
- valor por carta: comum 5, raro 15, épico 50, lendário 200;
- o pó compra o Pacote do Estacionamento (60 pó).

## Servidor (novo `api/baralho.js` + tabelas em `api/schema.js`)

**Tabelas:**
- `carteira(user_id PK, creditos, po, boas_vindas)`;
- `extrato(id, user_id, moeda, delta, motivo, ref, created_at)`: todo ganho e gasto (partida, compra, pó, admin);
- `pacotes(id, user_id, tipo, origem, created_at, aberto_em, resultado JSON)`: inventário = pacotes com `aberto_em IS NULL`;
- `colecao(user_id, card_id, qtd, primeira_em, PK(user_id, card_id))`.

**Rotas (login obrigatório):**
- `GET /api/baralho`:
  - devolve carteira, pacotes fechados, coleção (`{card_id: qtd}`) e a lista de pacotes com preços e chances (a tela mostra as chances);
  - no primeiro acesso, cria a carteira e o pacote de boas-vindas.
- `POST /api/baralho/comprar {tipo, moeda: 'creditos'|'po'}`:
  - uma única instrução SQL condicional (`UPDATE carteira SET creditos = creditos - $p WHERE user_id = $1 AND creditos >= $p RETURNING`), então dois cliques não gastam 2×;
  - sem saldo → 402.
- `POST /api/baralho/abrir {pacotes: [ids], máx 10}`:
  - `UPDATE pacotes SET aberto_em = ... WHERE id = ANY(...) AND user_id = $1 AND aberto_em IS NULL RETURNING`: uso único, e pacote de outra conta não abre;
  - sorteia as cartas, soma na coleção (`qtd + 1`), guarda o resultado;
  - devolve `[{pacote, tipo, cartas: [{id, raridade, nova}]}]`. **Não converte nada em pó.**
- `POST /api/baralho/po {cartas: {card_id: quantas}}` ou `{todas: true}`:
  - converte repetidas em pó, sempre deixando `qtd >= 1`;
  - `UPDATE colecao SET qtd = qtd - $n WHERE ... AND qtd - $n >= 1`;
  - soma o pó na carteira e registra no extrato;
  - devolve a carteira e a coleção novas.
- **Créditos no jogo:** em `api/games.js` (`submit`), depois de gravar a partida verificada com `score > 0`, credita na carteira (criando-a se não existir) e devolve `credits` na resposta. O `js/game-dialog.js` mostra "+N créditos" no fim do jogo.
- **Admin:**
  - rota `POST /api/admin/users/:id/baralho {creditos?, po?, pacote?}` para dar ou tirar créditos e pó, ou dar um pacote; grava em `admin_log`;
  - no terminal (`js/admin.js`), a conta aberta mostra carteira e coleção; comandos `credits <n>`, `dust <n>` e `pack <tipo>`.

## Site
**1. Aba "Baralho" na Ficha do Leitor** (`js/auth-widget.js`, em `mostrarVista`; só com login):
- carteira (créditos e pó) e a loja dos 3 pacotes: arte, preço, "Comprar" (créditos ou pó) e chances;
- **inventário** de pacotes fechados: selecionar → "Abrir"; com 2 ou mais, também "Abrir N" (até 10 por vez);
- **fichário** da coleção em grade:
  - carta tida com selo `x2`, `x3` e o botão "Transformar repetidas";
  - carta que falta aparece como silhueta "???" com o número (como o álbum de Enzos secretos);
  - clicar na carta mostra a carta grande;
- ficha pública de outro leitor (`/api/readers/:id`): "cartas: 5/7", com o número de cartas diferentes.

**2. Abertura em tela cheia** (novo `js/baralho.js` + CSS):
- a Ficha fecha; um `<dialog>` em tela cheia escurece o fundo;
- o pacote treme, rasga e as cartas saem viradas para baixo;
- clicar (ou "Revelar todas") vira cada carta:
  - comum e raro: moldura da cor da raridade;
  - épico: foil holográfico que segue o mouse (reaproveita `.book-foil` / `--mx --my`);
  - lendário: moldura dourada com reflexo correndo, estouro de gibi (`--estouro`) e brilho;
- selo **"NOVA!"** na primeira cópia e **"REPETIDA x3"** nas outras (a conversão em pó é depois, no inventário);
- vários pacotes: "Próximo pacote (2/5)" e, no fim, o resumo;
- `prefers-reduced-motion`: sem animação, as cartas aparecem direto;
- ao fechar, reabre a Ficha na aba Baralho.

**3. Componente carta** (um só, usado no fichário, na abertura e na carta grande):
- arte recortada, nome em Bangers (`--font-heading`), faixa da raridade, número "#003/007" e a frase;
- CSS por raridade (`--carta-cor`, `--carta-borda`, `.carta-tcg--epico`, `.carta-tcg--lendario`), no estilo gibi do site (tokens `--ink`, `--paper`, `--stroke`, `--pop`...).

## Arquivos
- **Novos:**
  - `js/baralho-dados.js`, `api/baralho.js`, `js/baralho.js`;
  - `test/baralho.test.js`.
- **Mudam:**
  - `api/schema.js`, `api/handler.js`, `api/games.js`, `api/admin.js`;
  - `js/auth-widget.js`, `js/game-dialog.js`, `js/admin.js`;
  - `css/style.css`;
  - as páginas `*.html` com a Ficha (scripts e cache-bust);
  - `docs/TESTES-PENDENTES.md`, `README.md`.

## Quem faz o quê (Claude × Gemini)
Regras do Henrique:
- **o Claude não faz QA a não ser que seja realmente necessário**;
- testes grandes, robôs e telas vão para o Gemini;
- o Gemini pode fazer mais que QA, a critério do Claude.

**Como delegar ao Gemini:**
- Escreva uma tarefa `.md` em `E:\AI Workshop\Bridge\tarefas\`. Protocolo em `Bridge\README.md`; as tarefas anteriores estão em `Bridge\feitas\`, e as 17 e 18 servem de modelo.
- O Gemini responde em `Bridge\respostas\` e roda sozinho quando aparece uma tarefa.
- Peça `/teamwork-preview` com vários agentes em arquivos separados.
- **Antes de delegar, faça commit** do seu trabalho: o Gemini já desfez mudanças sem commit.
- Para QA, o Gemini testa numa cópia fixa (`git worktree add ... <commit>`) com o servidor em:
  ```
  ENZO_DB=memoria  ENZO_LOGIN_FALSO=1  ADMIN_EMAILS=chefe@teste.local
  ```
  - O login falso aceita a credencial `teste:<apelido>:<Nome>`, com 20+ caracteres.
- Cada comando grava a própria saída em arquivo (`*> respostas\NN-*.txt`). **Confira sempre**: o Gemini já inventou saídas e números.

**Sugestão de divisão:**
- **Claude:** `baralho-dados.js`, `api/baralho.js` e a lógica de sorteio e dinheiro (sensível), as rotas, o design da carta e da abertura.
- **Gemini, construção:** `test/baralho.test.js` a partir de uma especificação exata (a lista da Fase 1), comandos do terminal admin, cache-bust, README e TESTES-PENDENTES.
- **Gemini, QA:** calibrar créditos por minuto; abrir 1 e 10 pacotes; efeitos de raridade; transformar em pó; computador e celular; reduced-motion.

## Fases
1. **Dados e servidor:** `baralho-dados.js`, tabelas, rotas e créditos nas partidas. `test/baralho.test.js` cobre:
   - comprar sem saldo → 402;
   - clique duplo não gasta 2×;
   - pacote abre uma vez só;
   - pacote de outra conta → 404;
   - garantias de raridade;
   - repetida entra como `qtd + 1`;
   - transformar em pó mantém 1 e credita o valor certo;
   - pó compra pacote;
   - 10 mil sorteios dentro de ±2% das chances;
   - boas-vindas uma vez só;
   - partida verificada credita, partida recusada não.
2. **Aba Baralho na Ficha:** carteira, loja, inventário, fichário e transformar em pó.
3. **Abertura em tela cheia** com os efeitos de raridade.
4. **Resto:** "+N créditos" nos jogos, admin (rota e terminal), ficha pública.
5. **QA pelo Gemini** e calibração dos créditos.
6. **Conteúdo da fase 2:** campos e goons (dados e arte); talvez conquistas de coleção ("Baralho completo").

## Verificação
- O Claude roda só os testes rápidos da API que escreveu (`node --test test/baralho.test.js`), quando precisar. A suíte inteira, os robôs e as telas ficam com o Gemini.
- Itens de tela vão para `docs/TESTES-PENDENTES.md`.
- Sem push até o Henrique pedir.

## Pendências de antes deste plano (estado em 2026-09-24)
- **Commits locais ainda sem push** (o último push foi `3a43f73`, painel admin):
  - conquistas do Superkid e do Torado;
  - login falso para QA;
  - Cartas dos Leitores (comentários) com Apagar, Censurar e Banir para o admin;
  - function fora do git;
  - este plano.
- **Gemini — tarefa 17** (QA do terminal admin e das conquistas novas) e **tarefa 18** (QA das Cartas dos Leitores): quando as respostas saírem em `Bridge\respostas\`, conferir, corrigir o que quebrou e mover para `Bridge\feitas\`.
- `ADMIN_EMAILS` já está configurado no Netlify pelo Henrique.
