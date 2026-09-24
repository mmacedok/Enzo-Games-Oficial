
# Plano: Baralho Enzo — pacotes de cartas colecionáveis (TCG)

Status: **plano aprovado em 2026-09-24, nada implementado ainda.**

## Contexto
Henrique quer um minigame de abrir pacotes de cartas, estilo TCG, no site.
- Cada personagem já publicado vira uma carta.
- Cada carta tem uma raridade — comum, raro, épico ou lendário — que define a chance de sair e a aparência:
  - comum e raro mudam só a cor da carta;
  - épico tem foil (brilho holográfico);
  - lendário é dourado e reluzente.
- Numa segunda fase entram as cartas "filler": campos (lugares) e goons (os caras de coração, a Encantadora...).

Respostas do Henrique:
1. **3 tipos de pacote**, comprados com **créditos**. Os créditos vêm dos minigames: a pontuação de cada partida entra na conta em forma de créditos.
2. **Inventário na Ficha do Leitor.**
   - A pessoa escolhe um pacote no inventário e clica em "Abrir".
   - A Ficha fecha, o fundo escurece e a animação de abrir o pacote ocupa a tela inteira.
   - Com mais de um pacote, aparece a opção de abrir vários.
3. **Repetidas viram "pó de estrela"**, que também compra pacotes.
4. **Só com login.** O sorteio é feito no servidor e a coleção fica salva na conta.

Nome do recurso: **"Baralho Enzo"**. No código, `baralho`, para não confundir com as "Cartas dos Leitores" (os comentários).

## Cartas (dados em `js/baralho-dados.js`)
A lista fica num único arquivo UMD, compartilhado pelo site e pelo servidor, no mesmo padrão de `js/conquistas.js`.

Formato de cada carta: `{ id, numero, nome, tipo: 'personagem'|'campo'|'goon', raridade, peso, arte, foco, frase }`.
- `arte`: a ficha em `assets/Personagens/`, servida pelo pipeline de imagens web que já existe (`lib/web-images.js` / `images.generated.js`), então não baixa os PNGs de 7 MB.
- `foco`: o `object-position` do recorte na carta.

Raridades iniciais. **São sugestão; o Henrique ajusta:**

| Carta | Raridade |
|---|---|
| Enzo Games | Lendário |
| Cabo Côco (a ficha "banida") | Lendário |
| Degustador da Noite | Épico |
| O Inominável | Épico |
| Hatsune Neves | Raro |
| Superkid | Raro |
| ItaloLOL | Comum |

Na fase 2 entram os campos (Toradolândia, Estacionamento, Piscina de Macarronada...) e os goons (caras de coração, Encantadora, Chorão, Stand do Joinha...). Eles preenchem principalmente o comum e o raro.

**Sorteio de cada carta:**
1. Primeiro sorteia a raridade pelas chances do pacote.
2. Depois sorteia a carta dentro daquela raridade, pelo `peso` de cada uma.

Se uma raridade estiver vazia, o sorteio desce para a raridade de baixo. O servidor usa `crypto.randomInt`, e o sorteador é injetável nos testes.

## Pacotes (em `js/baralho-dados.js`; preços e chances ajustáveis)

| Pacote | Preço | Cartas | Chances por carta (C/R/E/L) | Garantia |
|---|---|---|---|---|
| **Pacote do Estacionamento** | 100 créditos (ou 60 pó) | 3 | 72 / 22 / 5 / 1 | — |
| **Pacote da Toradolândia** | 300 créditos | 5 | 60 / 28 / 10 / 2 | 1 raro ou melhor |
| **Pacote da Piscina de Macarronada** | 900 créditos | 5 | 40 / 35 / 19 / 6 | 1 épico ou melhor |

**Créditos:** toda partida **verificada** (que passou no anti-cheat, dentro de `api/games.js` `submit`) credita:
- Flappy: `pontos × 10`;
- Degustação Noturna: `pontos × 1`.

Os fatores são calibrados com a média real das partidas: uma tarefa para o Gemini joga com o robô e mede. O alvo é **uns 5 minutos de jogo por Pacote do Estacionamento**.
- Limite de 2.000 créditos por dia, contra robôs.
- Bônus de boas-vindas: 1 Pacote do Estacionamento no primeiro acesso ao Baralho.

**Pó de estrela:** carta repetida vira pó na hora.
- comum 5, raro 15, épico 50, lendário 200;
- o pó compra o Pacote do Estacionamento (60 pó).

## Servidor (novo `api/baralho.js` + tabelas em `api/schema.js`)

**Tabelas:**
- `carteira(user_id PK, creditos, po, boas_vindas)`;
- `extrato(id, user_id, moeda, delta, motivo, ref, created_at)`: todo ganho e gasto, para auditoria e para o terminal;
- `pacotes(id, user_id, tipo, origem, created_at, aberto_em, resultado JSON)`: o inventário são os pacotes não abertos;
- `colecao(user_id, card_id, qtd, primeira_em, PK(user_id, card_id))`.

**Rotas (todas com login, mesmo padrão de `api/user.js`):**
- `GET /api/baralho`: carteira, pacotes fechados, coleção, e a lista de pacotes com preços e chances (a tela mostra as chances, por transparência).
- `POST /api/baralho/comprar {tipo, moeda}`: debita a moeda e cria o pacote no inventário. É uma única instrução SQL condicional (`UPDATE carteira SET creditos = creditos - $p WHERE creditos >= $p RETURNING`), então dois cliques ao mesmo tempo não gastam em dobro.
- `POST /api/baralho/abrir {pacotes: [ids], máx 10}`:
  - marca `aberto_em` com `UPDATE ... WHERE aberto_em IS NULL RETURNING`, de uso único como o runToken;
  - sorteia as cartas e grava a coleção;
  - converte repetidas em pó;
  - devolve `[{pacote, cartas:[{id, raridade, nova, po}]}]`.
- **Créditos no jogo:** em `api/games.js`, depois de gravar a partida verificada, credita e devolve `credits` na resposta. `js/game-dialog.js` mostra "+N créditos" na tela de fim de jogo.
- **Admin:** `POST /api/admin/users/:id/baralho {creditos, po, pacote}` para dar créditos, pó ou um pacote. No terminal, a conta aberta mostra carteira e coleção, com os comandos `credits <n>` e `pack <tipo>`. Tudo entra no `admin_log`.

## Site
**1. Aba "Baralho" na Ficha do Leitor** (`js/auth-widget.js`, em `mostrarVista`, que já tem as abas):
- no topo, carteira (créditos e pó) e a loja com os 3 pacotes: arte, preço, "Comprar" e as chances;
- **inventário** de pacotes fechados: selecionar um pacote → "Abrir"; com 2 ou mais, também "Abrir N";
- **fichário** da coleção em grade: carta tida com `x2`, `x3`; carta que falta aparece como silhueta "???" com o número (como o álbum de secretos);
- na ficha pública de outros leitores: "cartas: 5/7", só leitura.

**2. Abertura em tela cheia** (novo `js/baralho.js` + CSS):
- a Ficha fecha; um `<dialog>` em tela cheia escurece o fundo;
- o pacote treme, rasga e as cartas saem viradas para baixo;
- clicar (ou "Revelar todas") vira cada carta:
  - comum e raro: moldura da cor da raridade;
  - épico: foil holográfico que segue o mouse, reaproveitando o efeito `.book-foil` / `--mx --my` de `js/shelf.js` e `css/style.css`;
  - lendário: moldura dourada com reflexo correndo, estouro de gibi (`--estouro`) e brilho;
- selo **"NOVA!"** ou **"+15 pó"** nas repetidas;
- vários pacotes: "Próximo pacote (2/5)" e, no fim, um resumo;
- `prefers-reduced-motion`: sem a animação, as cartas aparecem direto;
- ao fechar, volta para a aba Baralho da Ficha.

**3. Carta** (componente único, usado no fichário, na abertura e na ficha pública):
- recorte da arte, nome em Bangers, raridade em faixa, número "#003/007" e a frase;
- CSS com variáveis por raridade: `--carta-cor`, `--carta-borda`, e as classes `.carta-tcg--epico` e `.carta-tcg--lendario`.

## Arquivos
- **Novos:**
  - `js/baralho-dados.js`, `api/baralho.js`, `js/baralho.js`;
  - `test/baralho.test.js`, `docs/PLANO-BARALHO.md` (cópia deste plano).
- **Mudam:**
  - `api/schema.js`, `api/handler.js`, `api/games.js` (créditos), `api/admin.js`;
  - `js/auth-widget.js` (aba Baralho), `js/game-dialog.js` ("+N créditos"), `js/admin.js`;
  - `css/style.css`;
  - as páginas com Ficha (cache-bust e o `<script>` do baralho);
  - `docs/TESTES-PENDENTES.md`, `README.md`.

## Fases
1. Dados e servidor (`baralho-dados.js`, tabelas, rotas, créditos nas partidas) com `test/baralho.test.js`:
   - comprar sem saldo → 402;
   - clique duplo não gasta 2×;
   - pacote aberto só uma vez;
   - pacote de outra conta → 404;
   - garantias de raridade;
   - repetida vira pó;
   - distribuição de 10 mil sorteios dentro de ±2% das chances;
   - limite diário de créditos;
   - boas-vindas uma vez só.
2. Aba Baralho na Ficha (carteira, loja, inventário, fichário).
3. Abertura em tela cheia com os efeitos de raridade.
4. "+N créditos" nos jogos, admin (rota e terminal) e ficha pública.
5. QA pelo Gemini (`/teamwork-preview`, com a cópia fixa via `git worktree` e o `ENZO_LOGIN_FALSO` como nas tarefas 17 e 18):
   - calibrar créditos por minuto;
   - abrir 1 e 10 pacotes no computador e no celular;
   - efeitos de raridade;
   - reduced-motion.
6. Fase 2 do conteúdo: cartas de campo e goons (só dados e arte), talvez conquistas de coleção ("Baralho completo").

## Verificação
- `node --test test/baralho.test.js` e `test/api.test.js` por mim; a suíte inteira, os robôs e as telas pelo Gemini (regra do Henrique).
- Os itens de tela vão para `docs/TESTES-PENDENTES.md`.
- Sem push até o Henrique pedir.
