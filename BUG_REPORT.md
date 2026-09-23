# Bug Report — Enzo Games Site

> **Registro histórico da auditoria.** As linhas, trechos e planos abaixo descrevem
> a versão anterior. Estado e verificações atuais: [docs/CORRECOES.md](docs/CORRECOES.md).
> A revisão de jogabilidade e navegação de 16/09/2026 corrigiu regressões que os
> testes antigos não detectavam. Não interpretar as sugestões adicionais como
> funcionalidades já implementadas.

**Projeto:** Enzo Games Site (ex-`enzo-games-comic`)
**Data da auditoria:** 2026-09-16
**Escopo auditado (código próprio):** `index.html`, `reader.html`, `personagens.html`, `degustador.html`, `css/style.css`, `js/main.js`, `js/reader.js`, `js/reader.core.js`, `js/game.js`, `js/game.test.js`, `server.js`, `atualizar.js`, `watch.js`, `scripts/generate_mask_node.js`, `data/database.json`, `data/leaderboard.json`, `package.json`, scripts utilitários (`remove_bg.*`, `process_images.py`, `resize_cursor*`).
**Fora de escopo:** `node_modules/`, arquivos de imagem em si, artefatos de agente em `.agents/`.

**Resumo:** 34 problemas encontrados — **5 críticos**, **11 altos**, **12 médios**, **6 baixos**. Nenhum deles foi corrigido nesta auditoria: este documento é apenas o diagnóstico + plano de correção aprovado para execução.

---

## Índice

| # | Título | Severidade | Arquivo principal |
|---|---|---|---|
| [01](#bug-01) | Dois motores de renderização concorrentes no leitor | 🔴 Crítico | `reader.html` |
| [02](#bug-02) | `/api/leaderboard` aceita qualquer pontuação (sem validação) | 🔴 Crítico | `server.js` |
| [03](#bug-03) | `getImageData` sobre imagem same-origin quebra a transparência do cano | 🔴 Crítico | `js/game.js` |
| [04](#bug-04) | O jogo é inalcançável (regressão do requisito "abrir pelo logo") | 🔴 Crítico | `js/game.js` |
| [05](#bug-05) | Minigame com timing dependente de FPS (sem delta time) | 🔴 Crítico | `js/game.js` |
| [06](#bug-06) | `atualizar.js` destrói o `database.json` a cada build | 🟠 Alto | `atualizar.js` |
| [07](#bug-07) | O spin-off "Degustador da Noite" é invisível para o scanner | 🟠 Alto | `atualizar.js` |
| [08](#bug-08) | `easter_egg.jpg` não existe → easter egg quebrado | 🟠 Alto | `atualizar.js` / `database.json` |
| [09](#bug-09) | Hitbox dos canos não corresponde ao desenho (cano invisível) | 🟠 Alto | `js/game.js` |
| [10](#bug-10) | `pipe.png` é na verdade um JPEG 1024×1024 | 🟠 Alto | `assets/flappy/pipe.png` |
| [11](#bug-11) | `bg.jpg` inexistente → fundo do jogo sempre no fallback | 🟠 Alto | `js/game.js` |
| [12](#bug-12) | CSS quebrado: `}` órfão mata o bloco mobile | 🟠 Alto | `css/style.css` |
| [13](#bug-13) | Modal de game over trava o reinício (softlock) | 🟠 Alto | `js/game.js` |
| [14](#bug-14) | Suíte E2E morta e apontando para o jogo antigo | 🟠 Alto | `js/game.test.js` |
| [15](#bug-15) | Cache-busting por imagem × milhões de px de HQ | 🟠 Alto | `js/reader.core.js` |
| [16](#bug-16) | Cursores customizados são sobrescritos por `!important` | 🟠 Alto | `css/style.css` |
| [17](#bug-17) | `.donation-footer` usa variáveis CSS inexistentes | 🟡 Médio | `css/style.css` |
| [18](#bug-18) | Player de zoom não persiste nem anima no lugar certo | 🟡 Médio | `js/reader.core.js` |
| [19](#bug-19) | Seleção de capítulo consome o `<select>` como "gibi" | 🟡 Médio | `js/reader.core.js` |
| [20](#bug-20) | Espaço sempre bloqueado, mesmo com o jogo fechado | 🟡 Médio | `js/game.js` |
| [21](#bug-21) | `restart()` silenciosamente ignorado (retorno mudo) | 🟡 Médio | `js/game.js` |
| [22](#bug-22) | Leaderboard sem tratamento de erro HTTP + corrida no botão ENVIAR | 🟡 Médio | `js/game.js` |
| [23](#bug-23) | Guarda de modal só olha `display === 'block'` | 🟡 Médio | `js/game.js` |
| [24](#bug-24) | `main.js` limpa o hero antes de validar os dados | 🟡 Médio | `js/main.js` |
| [25](#bug-25) | Lógica de "LANÇAMENTO" só funciona com 6+ capítulos | 🟡 Médio | `js/main.js` |
| [26](#bug-26) | Grid 3D do desktop é sobrescrito no mobile; hover preso em touch | 🟡 Médio | `js/main.js` / `css` |
| [27](#bug-27) | Páginas caríssimas: capas/fichas gigantes + `innerHTML` com concatenação | 🟡 Médio | `index.html` / `js/main.js` |
| [28](#bug-28) | `generateMask` monta 8,5M objetos em arrays 2D | 🟡 Médio | `scripts/generate_mask_node.js` |
| [29](#bug-29) | Detecção de máscara por comparação de bytes | 🟡 Médio | `server.js` / `atualizar.js` |
| [30](#bug-30) | `touchstart` com `preventDefault` sem `passive:false` | 🔵 Baixo | `js/game.js` |
| [31](#bug-31) | Versões de script inconsistentes entre páginas | 🔵 Baixo | HTMLs |
| [32](#bug-32) | `degustador.html` linka para gibi inexistente | 🔵 Baixo | `degustador.html` |
| [33](#bug-33) | Scripts utilitários órfãos e caminhos absolutos antigos | 🔵 Baixo | raiz do projeto |
| [34](#bug-34) | `.agents/` versiona 40+ arquivos de relatório desatualizados | 🔵 Baixo | `.agents/` |

---

<a id="bug-01"></a>
## 🔴 01 — Dois motores de renderização concorrentes no leitor

**Arquivos:** `reader.html` (linhas 19 e 72), `js/reader.js` (182 linhas), `js/reader.core.js` (412 linhas)

`reader.html` carrega **os dois** scripts:

```html
<script src="js/reader.js?v=37"></script>       <!-- linha 19 -->
...
<script src="js/reader.core.js?v=7"></script>   <!-- linha 72 -->
```

Ambos registram um listener de `DOMContentLoaded` que busca `data/database.json`, chama `populateChapterSelect()`, `renderPage()` e `setupEventListeners()`. Como `reader.core.js` carrega depois, ele é o **último** a executar: limpa (`innerHTML = ''`) tudo que `reader.js` acabou de montar e remonta.

Consequências observáveis:

1. **Toda a renderização inicial é jogada fora** — o navegador baixa e decodifica as HQs duas vezes em sequência.
2. **`setupEventListeners()` roda duas vezes** → o listener de teclado (`keydown`) é registrado 2×. Cada `ArrowUp`/`ArrowDown` executa `document.body.classList.toggle('ui-hidden')` duas vezes → **as ilhas flutuantes piscam e voltam** (o toggle se anula). O mesmo para o `change` do `<select>`: dois `window.location.href` disparados.
3. **Divergência de features:** `reader.js` não tem capa, nem tema degustador, nem easter eggs, nem botão "próximo capítulo". Se a ordem de carga mudar (cache parcial, HTTP/2 reorder, mover a tag), o leitor **perde funcionalidades** silenciosamente.
4. O `.agents/orchestrator/handoff.md` afirma explicitamente: *"Removed redundant script tag `<script src="js/reader.js">` to establish `js/reader.core.js` as single rendering engine"* — a remoção foi **revertida** e ninguém percebeu.

### Plano de correção

1. Em `reader.html`, apagar a linha 19 (`<script src="js/reader.js?v=37"></script>`) mantendo apenas `js/reader.core.js?v=7` no fim do `body`.
2. Apagar `js/reader.js` do repositório (é um fork obsoleto e divergente).
3. Proteção contra regressão: deixar um comentário no topo de `reader.core.js` — `// ÚNICO motor de renderização do leitor. Não carregar js/reader.js.`
4. Validar: abrir `reader.html?comic=capitulo-2` e conferir no DevTools que (a) só há 1 request de `database.json`, (b) a capa aparece, (c) um único `ArrowUp` esconde as ilhas e elas **não voltam**.
5. Teste automatizado sugerido (ver #14): assertar `document.querySelectorAll('#image-container > *').length` contra o número esperado `1 (capa) + pages.length + eventual botão`.

**Esforço:** ~15 min. **Risco do fix:** baixo (arquivo redundante).

---

<a id="bug-02"></a>
## 🔴 02 — `/api/leaderboard` aceita qualquer pontuação (sem validação)

**Arquivo:** `server.js` (linhas 75–103), `js/game.js` (linhas 634–654)

```js
app.post('/api/leaderboard', (req, res) => {
    let { name, score } = req.body;
    ...
    score = parseInt(score, 10);
    if (isNaN(score) || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const scores = readLeaderboard();
    scores.push({ name, score, date: new Date().toISOString() });
```

Problemas:

- **Nenhum limite superior de score.** `POST {"name":"X","score":999999999}` entra direto no ranking global e fica no topo para sempre. O ranking ("GLOBAL RANKING") é exibido publicamente na home.
- **Sem autenticação, sem rate limit, sem CSRF.** `cors()` está com origem `*`, então qualquer site/página aberta no navegador do dono pode gravar no ranking local em `http://localhost:3000`.
- **Deduplicação/ordenação ingênua:** `scores.push()` + `sort` a cada requisição e `slice(0,100)` só na escrita — nome "ANONYMOUS" repetido domina o topo.
- O mesmo `name` é sanitizado no servidor **e** no cliente (lógica duplicada, com regras diferentes: o cliente faz `toUpperCase()` + `substring(10)`, o servidor faz `toUpperCase()` + `replace(/[^A-Z0-9 ]/g,'')`).
- Não há `try/catch` em `writeLeaderboard` — se `data/leaderboard.json` estiver bloqueado (antivírus, arquivo aberto), o processo derruba a request sem resposta.

### Plano de correção

1. **Cap de placar** derivado da física: com `gap`=180, `dx`=4 e spawn a cada 40 frames, existe um teto plausível de pontos por segundo. Rejeitar `score > 300` (ajustar após medir) com `400`.
2. **Validação de tipo estrita:** `Number.isInteger(score) && score >= 0`.
3. **Token de sessão curto:** `GET /api/leaderboard/session` devolve um token assinado (HMAC com segredo em `process.env`) e o timestamp; o `POST` só aceita se o token for válido e a duração decorrida for compatível com o score. Bloqueia o `curl` trivial sem exigir login.
4. **Rate limit por IP** (ex.: 5 envios/min) com um `Map` em memória — sem dependência nova.
5. **Sanitização em um único lugar:** extrair `sanitizeName()` em um módulo `lib/leaderboard.js` usado pelo servidor; o cliente envia o nome cru.
6. Envolver escrita em `try/catch` com `res.status(500)` e log.
7. Teste: `curl -X POST -d '{"name":"HACK","score":999999}'` deve retornar `400`; e o ranking em `data/leaderboard.json` deve ser **sanitizado retroativamente** (remover entradas acima do cap).

**Esforço:** ~1–2 h. **Risco do fix:** médio (contrato de API do jogo precisa acompanhar).

---

<a id="bug-03"></a>
## 🔴 03 — `getImageData` sobre imagem same-origin quebra a transparência do cano

**Arquivo:** `js/game.js` (linhas 160–206, 226–235)

```js
function makeTransparent(img) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width  = img.naturalWidth  || img.width;
    offCanvas.height = img.naturalHeight || img.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);
    try {
        const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        ...
    } catch (e) {}          // ← falha silenciosa, linha 204
    return offCanvas;        // ← devolve o canvas com fundo BRANCO opaco
}
```

Quando `getImageData` lança `SecurityError` (canvas "tainted"), o `catch` engole a exceção **sem log** e a função devolve o canvas original — com o fundo branco sólido intacto. O jogo então desenha o cano como um quadrado branco gigante. Não há como o desenvolvedor perceber: nenhum `console.warn`, nenhum fallback para a forma vetorial.

Além disso, o algoritmo é um **threshold global** (`r>230 && g>230 && b>230`), não um flood fill pelas bordas: qualquer pixel branco **dentro** do desenho (brilho, olho do pássaro, dente metálico) também vira buraco transparente.

E há um custo de CPU por carregamento: dois canvases de 896×896 = ~1,6M px varridos pixel a pixel na thread principal **a cada carregamento da home** (não é cacheado entre páginas).

### Plano de correção

1. **Não tratar em runtime o que pode ser tratado no build.** As imagens `bird.png` e `target.png` já são PNG com alpha (verificado: `89504e47…`); o fundo branco é da arte, não do formato. Rodar o utilitário offline uma vez e **commitar os PNGs já com transparência**, removendo `makeTransparent()` do fluxo de carregamento. Ganho duplo: corrige o bug e elimina ~1,6M px/frame de processamento.
2. Se quiser manter o runtime: trocar o threshold global por **flood fill a partir das 4 bordas** (mesma abordagem já usada em `scripts/generate_mask_node.js`) e registrar `console.warn('Canvas tainted — usando sprite original', e)`.
3. Pré-processar via `<canvas>` só quando `img.complete` e realmente necessário, e memoizar o resultado em `sessionStorage`/`OffscreenCanvas` transferível para não recalcular.
4. Validar com o olho: abrir a home, clicar no logo e conferir que pássaro e macarronada não têm moldura branca nem furos internos.

**Esforço:** ~1 h (build-time) ou ~30 min (flood fill). **Risco:** baixo.

---

<a id="bug-04"></a>
## 🔴 04 — O jogo é inalcançável (regressão do requisito "abrir pelo logo")

**Arquivos:** `js/game.js` (linhas 624–631, 496–510), `js/main.js` (linha 33), `ORIGINAL_REQUEST.md`

O requisito original é explícito:

> *"The game must be integrated into the existing site and accessible ONLY by clicking the 'Enzo Games' logo in the main header."*
> *"When the user clicks the 'Enzo Games' logo in the site header, the main 'Hero Banner' section must dynamically be replaced by the game canvas."*

`game.js` se auto-injeta em `#hero-comic`:

```js
start() {
    const heroComic = document.getElementById('hero-comic');
    if (heroComic) { heroComic.appendChild(container); ... }
```

Mas `main.js` faz, no `DOMContentLoaded` (linha 33):

```js
heroSection.innerHTML = '';   // apaga o container do jogo
```

E como `game.js` executa **depois** de registrar o listener (a injeção do container ocorre no fim do IIFE, síncrono, mas `start()` só é chamado no clique), **todo clique no logo após o carregamento do banco apaga e recria o conteúdo do hero** — o container do jogo é removido do DOM. O `appendChild` seguinte reinsere o container, mas:

- **Se o clique ocorrer ANTES do `fetch` terminar** (rede lenta / `database.json` grande), o `innerHTML = ''` do `main.js` destrói o container **com o jogo rodando**. `game.close()` depois procura `.hero-banner`, não acha, e o `requestAnimationFrame` continua rodando sobre um canvas **desanexado do DOM** (vazamento de loop + CPU queimando).
- O `main.js` também **substitui o `.hero-banner`** logo depois, então o "esconder o banner" do `start()` pode ser desfeito, resultando em banner + jogo empilhados.
- Não existe nenhum outro ponto de entrada: `game.start()` só é chamado no clique do logo. Com o logo ilegível/inacessível (ver #16 e #26) ou em mobile (ver #26), **o jogo é efetivamente inacessível**.

### Plano de correção

1. **Desacoplar o jogo do `#hero-comic`:** criar um `<section id="game-slot">` vazio no `index.html`, irmão do hero, e fazer `game.start()` injetar ali. `main.js` passa a operar só em `#hero-comic` e nunca toca no slot.
2. **Tornar `start()` idempotente e robusto a re-render:** guardar as referências de DOM (`canvas`, `ctx`, `scoreEl`, …) obtidas **na hora do `start()`** a partir de um template re-inserido, em vez de capturá-las uma única vez no IIFE (hoje `const canvas = container.querySelector(...)` roda uma vez para sempre).
3. **Cancelar o loop no `close()` e no `beforeunload`**, e adicionar uma guarda em `loop()`: `if (!this.isPlaying || !document.body.contains(canvas)) { this.isPlaying = false; return; }`.
4. **Fallback de acesso:** adicionar um botão visível "🎮 JOGAR" na home (o requisito diz "accessible ONLY by clicking the logo", mas como o logo é um `<h1>` decorado, um `role="button"` + `tabindex="0"` + handler de `Enter`/`Espaço` no próprio logo atende o requisito e resolve acessibilidade de teclado).
5. Validar: clicar no logo com a aba Network em "Slow 3G" e confirmar que o jogo continua funcional e que o banner desapareceu.

**Esforço:** ~1–2 h. **Risco:** médio (mexe no fluxo principal da home).

---

<a id="bug-05"></a>
## 🔴 05 — Minigame com timing dependente de FPS (sem delta time)

**Arquivo:** `js/game.js` (linhas 295–320, 341–393, 610–621)

Toda a física é por **frame**, não por segundo:

```js
update() { this.velocity += this.gravity; this.y += this.velocity; }   // gravity 0.3 px/frame²
...
if (game.frames % 40 === 0) { /* spawn */ }
p.x -= this.dx;                                                          // 4 px/frame
...
this.animationFrameId = requestAnimationFrame(() => this.loop());
```

Em um monitor de **144 Hz** o jogo roda 2,4× mais rápido que em 60 Hz: a gravidade efetiva triplica, os canos avançam a ~576 px/s em vez de 240 px/s, e a pontuação cresce 2,4× mais rápido. O jogo é **literalmente mais fácil ou mais difícil dependendo do hardware**. Também não há pausa quando a aba perde o foco: ao voltar, o `rAF` ressincroniza e o pássaro "teleporta" para a posição errada (o `dt` acumulado é ignorado).

### Plano de correção

1. Introduzir **delta time normalizado** no `loop(timestamp)`: calcular `dt = Math.min((ts - last) / (1000/60), 3)` e multiplicar por `dt` todos os incrementos por frame (`velocity += gravity * dt`, `y += velocity * dt`, `p.x -= dx * dt`, `frames += dt`).
2. Trocar o spawn por **distância percorrida** (`spawnAccumulator += dx * dt; if (spawnAccumulator >= 160) { spawn(); spawnAccumulator -= 160; }`) em vez de `frames % 40`, o que torna o espaçamento imune ao FPS.
3. Pausar no `document.hidden` (`visibilitychange`) e zerar o `last` ao voltar.
4. Validar: simular o loop com `dt` fixo de 1/60 e de 1/144 e confirmar que a distância percorrida em 10 s e a altura do pulo são iguais (±5%). Isso vira caso de teste em #14.

**Esforço:** ~1 h. **Risco:** médio (pode alterar a dificuldade percebida — recalibrar `gap`/`dx` depois).

---

<a id="bug-06"></a>
## 🟠 06 — `atualizar.js` destrói o `database.json` a cada build

**Arquivos:** `atualizar.js` (linhas 13–121), `watch.js` (linha 15), `data/database.json`

`atualizar.js` **não faz merge**: cria `const database = { comics: [] }` do zero e sobrescreve o arquivo com `fs.writeFileSync(outputFile, ...)`. Tudo o que foi editado à mão em `data/database.json` é perdido:

| Campo em `database.json` | O que `atualizar.js` gera |
|---|---|
| `capitulo-6.description = "Páginas do Capitulo 6"` | idem (colisão, mas por acaso) |
| `easterEggs[0].image = "assets/Capitulo 5/easter_egg.jpg"` | idem (arquivo inexistente, ver #08) |
| Ordem/títulos customizados | reescritos como `Capítulo N` |
| Gibi `degustador` (presente no disco em `assets/Spin Offs/`) | **removido** |

E o gatilho é automático: `watch.js` observa `assets/` com debounce de 1 s e executa `node atualizar.js` a cada arquivo novo. Basta o dono **largar uma imagem** na pasta para o banco ser reescrito.

Pior: `npm start` sobe `watch.js` **e** `server.js` em paralelo; `server.js` (linhas 23–42) também roda `generateMask()` no boot. São dois processos escrevendo em `assets/Personagens/cabo-coco.png` e o watcher reage ao próprio artefato que o build gerou.

### Plano de correção

1. **Separação fonte × derivado.** Criar `data/comics.manual.json` com metadados curados (`description`, `title`, `order`, `easterEggs`) e fazer `atualizar.js` apenas **mesclar** o resultado do scan por cima disso, casando por `id` (o campo manual sempre vence).
2. **Nunca apagar `easterEggs`** no rebuild: ler o bloco existente do `database.json` atual e reescrevê-lo, ou movê-lo para o arquivo manual (preferível).
3. **Ignorar o próprio artefato:** em `watch.js`, filtrar `filename` que termine em `cabo-coco.png` (ou usar um diretório `assets-cache/` para artefatos gerados) para cortar o loop watcher → build → watcher.
4. **Revisar a guarda de tamanho** (ver #29) para o build não rodar 2× por boot.
5. Fazer backup rotativo: antes de escrever, `database.json.bak` (1 nível) — barato e salva o dia.
6. Teste: rodar `npm run build` duas vezes seguidas e conferir `git diff data/database.json` vazio.

**Esforço:** ~2 h. **Risco:** médio (é o pipeline de publicação de conteúdo).

---

<a id="bug-07"></a>
## 🟠 07 — O spin-off "Degustador da Noite" é invisível para o scanner

**Arquivos:** `atualizar.js` (linhas 44–49), `degustador.html` (linha 69), `data/database.json`

O scanner só olha pastas com o **nome exato** `Capitulo N` diretamente sob `assets/`:

```js
for (let i = 1; i <= 20; i++) {
    const chapterName = `Capitulo ${i}`;
    const chapterPath = path.join(assetsDir, chapterName);
    if (fs.existsSync(chapterPath)) { ... }
}
```

Mas todo o spin-off está em `assets/Spin Offs/Degustador da noite/Capitulo 1/{Capa,Paginas}/`. Resultado: **nenhum item `degustador` é gerado**, e:

- `degustador.html` chama `playMacaroniTransition('reader.html?comic=degustador&chapter=1')` → `reader.core.js` não encontra o comic e faz `window.location.href = 'index.html'` — o botão "Ler Lançamento" **volta para a home**, sem mensagem.
- `main.js` filtra `c.id !== 'degustador'`, mas como o id nunca existe, o filtro é código morto.
- O `database.json` atual **tem** o `degustador` de uma edição manual antiga; o próximo `npm run build` (ou qualquer arquivo novo em `assets/`) o **apaga** (ver #06). Ou seja: o leitor funciona hoje e para de funcionar amanhã.

### Plano de correção

1. Generalizar o scanner: varrer `assets/**/Capitulo */` recursivamente (`fs.readdirSync(..., { withFileTypes: true })` recursivo) e derivar o `id` do caminho (`spin-off degustador → id: 'degustador'`) usando um mapa explícito em `data/comics.manual.json` (o "Capitulo 1" do spin-off é um **capítulo**, não um gibi — a modelagem precisa ser explícita).
2. No mínimo, adicionar uma entrada manual ao arquivo de metadados que o merge (#06) respeita, para o spin-off nunca mais sumir.
3. Validar: `npm run build`, depois abrir `degustador.html` → "Ler Lançamento" deve renderizar `assets/Spin Offs/Degustador da noite/Capitulo 1/Paginas/PAG1..4.png` e aplicar `body.theme-degustador`.
4. Tratar o caso "comic não encontrado" com uma mensagem na tela em vez de redirect silencioso (`reader.core.js` linha 52).

**Esforço:** ~2 h. **Risco:** médio.

---

<a id="bug-08"></a>
## 🟠 08 — `easter_egg.jpg` não existe → easter egg quebrado

**Arquivos:** `atualizar.js` (linhas 104–116), `data/database.json` (linha 109), `js/reader.core.js` (linhas 188–210)

Configurado:

```json
{ "comicId": "capitulo-5", "pageIndex": 3,
  "image": "assets/Capitulo 5/easter_egg.jpg",
  "box": { "left": "53%", "top": "52.5%", "width": "47%", "height": "19%" } }
```

Verificação de disco: `assets/Capitulo 5/easter_egg.jpg` → **não existe**. O arquivo real é `assets/Easter Eggs/Easter egg1.jpg` (3,5 MB). O `reader.core.js` cria o `<img src="assets/Capitulo 5/easter_egg.jpg">` mesmo assim; o clique revela uma **imagem quebrada** (`.show-secret` com `opacity: 1` sobre um ícone de imagem faltante). A imagem está no `database.json` **e** hardcoded no `atualizar.js`, então o bug sobrevive a rebuilds.

Além disso:
- O `pageIndex: 3` é a 4ª página (Cap 5 tem 5 páginas) — vale confirmar visualmente que é a página certa, porque o reader aplica offset (capa = índice visual extra).
- O hotspot é **invisível e sem rótulo** (`.easter-egg-trigger` sem texto/`title`), então nem teclado nem leitor de tela alcançam; e o CSS não define `cursor` próprio para ele (depende do override global de #16).
- O `setTimeout(..., 10000)` deixa a imagem exposta por 10 s enquanto a página pode ser rolada — sem `position: fixed`, ela fica no wrapper da página e "some" ao rolar.

### Plano de correção

1. Corrigir o caminho para `assets/Easter Eggs/Easter egg1.jpg` (ou copiar/otimizar o arquivo para `assets/Capitulo 5/easter_egg.jpg` e versioná-lo). Se for a segunda opção, **comprimir antes** (3,5 MB num hotspot de 19% de altura é desperdício — redimensionar para ~1200 px de largura).
2. Mover a lista de easter eggs para `data/comics.manual.json` (ver #06) e adicionar `alt` + `title` no `<img>`/trigger.
3. Adicionar `role="button"`, `tabindex="0"` e handler de `Enter` no `.easter-egg-trigger`.
4. Validar com Network em 200 (não 404) e inspeção do hotspot na página correta.

**Esforço:** ~40 min. **Risco:** baixo.

---

<a id="bug-09"></a>
## 🟠 09 — Hitbox dos canos não corresponde ao desenho (cano invisível)

**Arquivo:** `js/game.js` (linhas 341–456)

O cano é desenhado preservando a proporção do sprite:

```js
this.width = 75; this.gap = 180;
let scaleFactor = this.width / imgToDraw.width;   // 75 / 1024 ≈ 0.073
let drawH = imgToDraw.height * scaleFactor;       // 1024 → ≈ 75 px
ctx.drawImage(imgToDraw, 0, 0, this.width, drawH);          // cano de cima (altura 75)
ctx.drawImage(imgToDraw, p.x, p.y + this.gap, this.width, drawH); // cano de baixo (altura 75)
```

Mas a **colisão** considera o cano de baixo como uma parede que vai de `p.y + gap` até o fim do canvas:

```js
if (game.bird.x + game.bird.width > p.x &&
    game.bird.x < p.x + this.width &&
    game.bird.y + game.bird.height > p.y + this.gap) { game.setGameOver(); }
```

Ou seja: existe uma faixa de `canvas.height - (p.y + gap + 75)` pixels (centenas de px) onde o jogador **morre sem tocar em nada visível**. O mesmo do outro lado: o cano de cima desenhado tem só 75 px de altura, mas a colisão vale desde `y = 0` até `p.y` — se `p.y > 75`, há um **buraco visual** entre o topo da tela e o desenho, e mesmo assim o toque mata.

Some-se a isso que `p.y` (topo do vão) varia de 50 a `canvas.height - gap - 50` = 270, então em muitos sorteios o cano desenhado **nem alcança** o vão: parece que o pássaro passa livre e morre.

### Plano de correção

1. **Renderizar o cano até a borda:** para o cano de cima, esticar verticalmente de `0` até `p.y` (`ctx.drawImage(img, 0, 0, img.width, img.height, p.x, 0, this.width, p.y)` depois de qualquer `scale`) — ou repetir a textura em mosaico. Para o de baixo, de `p.y + gap` até `canvas.height`.
2. **Derivar a hitbox do desenho**, nunca de constantes paralelas: expor `getTopRect(p)` / `getBottomRect(p)` e usar **as mesmas** funções no `draw()` e no `update()`. Assim é impossível divergirem de novo.
3. Alternativa mais simples e honesta: implementar o sprite como **tile** (o asset é 1024×1024, dá para repetir o miolo) e manter hitbox = retângulo desenhado.
4. Validar: adicionar um modo debug (`?debug=1`) que desenha as hitboxes em vermelho sobre o jogo, jogar 30 s e conferir que nenhuma morte acontece fora de um retângulo vermelho.
5. Recalibrar `gap`/`dx` depois de #05 (delta time) — o balanceamento atual foi feito às cegas, presumindo 60 fps.

**Esforço:** ~1–2 h. **Risco:** médio (muda a dificuldade percebida — para melhor).

---

<a id="bug-10"></a>
## 🟠 10 — `pipe.png` é na verdade um JPEG 1024×1024

**Arquivo:** `assets/flappy/pipe.png`

Verificação binária:

```
assets/flappy/pipe.png   bytes=201891  magic=ffd8ff…  → JPEG, 1024×1024, 3 componentes (sem alpha)
assets/flappy/bird.png   bytes=434239  magic=89504e47 → PNG real
assets/flappy/target.png bytes=380164  magic=89504e47 → PNG real
```

Consequências:

1. **A extensão mente.** Qualquer servidor que confie na extensão serve `image/png` para um JPEG. O Chrome faz sniffing e até renderiza, mas ferramentas de build/CDN/otimização vão rejeitar ou corromper.
2. **Sem canal alpha.** O fundo branco do cano **não pode** ser removido — daí a dependência do `makeTransparent()` (#03), que por sua vez falha em silêncio. O resultado é o retrato perfeito de um bug em cascata: JPEG sem alpha → canvas opaco → `getImageData` engolido → cano branco gigante.
3. **1024×1024 para desenhar 75 px** → 200 KB de download e 1M px decodificados para nada.

Note que `process_images.py` (o script que gerou esses arquivos) **salva como PNG com alpha e faz crop** — logo o `pipe.png` atual **não** é produto dele (ou foi sobrescrito depois). O nome de entrada é o mesmo (`pipe.png`), então há um `assets/flappy/pipe.png` gerado corretamente em algum lugar que foi perdido.

### Plano de correção

1. Re-processar o cano com `process_images.py`/Pillow: abrir o JPEG, remover o branco por **flood fill das bordas**, cropar o bbox e salvar como **PNG RGBA redimensionado para ~150×600** (nunca mais 1024²).
2. Renomear para deixar explícito o que é: `assets/flappy/pipe.png` (RGBA) — e apagar a origem JPEG.
3. Adicionar um teste de asset que valide o magic number e a extensão de tudo em `assets/flappy/` (ver #14).
4. Recalibrar `drawH`/`gap` depois que o sprite tiver a proporção correta (ver #09).

**Esforço:** ~30 min. **Risco:** baixo.

---

<a id="bug-11"></a>
## 🟠 11 — `bg.jpg` inexistente → fundo do jogo sempre no fallback

**Arquivo:** `js/game.js` (linhas 234, 562–568)

```js
assets.bg.src = 'assets/flappy/bg.jpg';      // 404 — arquivo não existe
...
drawBg() { if (bgLoaded) { ... } else { ctx.fillStyle = '#70c5ce'; ctx.fillRect(...); } }
```

`assets/flappy/` contém apenas `bird.png`, `pipe.png` e `target.png`. O `assets.bg.onload` nunca dispara → `bgLoaded` é sempre `false` → o jogo **sempre** desenha o retângulo azul chapado. Não é um crash, mas é um 404 em toda carga da home e uma feature planejada (cenário) que nunca existiu.

### Plano de correção

1. Decidir: ou (a) criar um cenário leve (`bg.jpg` ~1200×600, <100 KB) e removê-lo do caminho crítico com `loading` apropriado, ou (b) **remover** `assets.bg`, `bgLoaded` e o ramo morto, deixando o azul chão como decisão de design documentada.
2. Em qualquer caso, eliminar o 404: um `onerror` explícito em cada `assets.*.onerror` que registre `console.info` — hoje **nenhuma** imagem tem handler de erro, então qualquer 404 futuro é invisível.
3. Validar: Network sem nenhum 404 ao abrir o jogo.

**Esforço:** ~20 min. **Risco:** baixo.

---

<a id="bug-12"></a>
## 🟠 12 — CSS quebrado: `}` órfão mata o bloco mobile

**Arquivo:** `css/style.css` (linhas 842–975)

O `@media (max-width: 768px)` abre na linha 842 e fecha na **linha 905**. Dentro dele existem regras legítimas (`.comic-grid`, `.hero-content`, `.garfield-classic-logo`, …). Mas, depois, nas linhas 967–975:

```css
.achievement-icon {      /* linha 967 — regra normal, nível raiz */
    font-size: 2.5rem;
}                        /* linha 969 — fecha .achievement-icon */

                         /* linha 971 vazia */
    .reader-title {      /* linha 972 — fora de qualquer bloco @media */
        font-size: 1rem;
    }
}                        /* linha 975 — } ÓRFÃO */

/* linha 977+ — .macaroni-wipe e TODO o resto do arquivo */
```

O `}` da linha 975 é um fechamento **sem bloco aberto**. O bloco de erro do parser CSS descarta do token inválido até o próximo `}` — efeito prático:

1. `.reader-title { font-size: 1rem }` fica **fora** do media query (o que pode até ser desejado), mas o `}` extra dispara recuperação de erro.
2. Dependendo do navegador, a regra **seguinte** (`.macaroni-wipe`, linha 980) pode ser engolida na recuperação — o overlay de transição de página (usado em **todos** os links do site) fica sem `position: fixed`, sem `z-index` e sem `transform`, resultando numa faixa gigante de macarronada tapando o topo da página.
3. É um erro silencioso: nenhum console de produção avisa sobre CSS.

Há ainda dois blocos **totalmente vazios** que são lixo do refactor de cursores: `.donation-footer` usa `background-color: var(--secondary-bg)` que **não existe** em `:root` (linhas 4–26) → a declaração é inválida e a cor cai para transparente. `.donation-text p` e `.pix-copy-btn` usam `var(--font-body)`, também **inexistente** → caem para a fonte herdada do `body` (funciona por acaso). Ver #17.

### Plano de correção

1. Remover o `}` órfão da linha 975 e mover `.reader-title` para junto das outras regras responsivas (ou para o nível raiz, se a intenção era global).
2. Passar o arquivo por um validador/linter (`npx csslint` ou o próprio "Problems" do VS Code) e zerar os erros de sintaxe.
3. Trocar `var(--secondary-bg)` por `var(--bg-surface)` e `var(--font-body)` por `var(--font-sans)` (ou **definir** as variáveis no `:root` se a intenção era ter uma paleta alternativa).
4. Validar: no DevTools → Coverage/Styles, confirmar que `.macaroni-wipe` tem `transform: translateY(-100%)` do valor computado; navegar entre páginas e conferir a transição.

**Esforço:** ~30 min. **Risco:** baixo.

---

<a id="bug-13"></a>
## 🟠 13 — Modal de game over trava o reinício (softlock)

**Arquivo:** `js/game.js` (linhas 528–560, 634–658)

```js
setGameOver() {
    ...
    if (this.score > 0) { nameModal.style.display = 'block'; nameInput.focus(); }
},
restart() {
    if (nameModal.style.display === 'block') return;   // ← sai calado
    ...
}
```

Fluxo de deadlock:

1. Jogador pontua (score > 0) → game over → `nameModal` abre.
2. Jogador aperta **ESPAÇO** ou clica no canvas tentando reiniciar. O handler chama `this.restart()`, que detecta o modal aberto e **retorna sem fazer nada** — nenhuma mensagem, nenhum feedback.
3. O modal é `position: absolute` **dentro de `#flappyenzo-game-box`** com `z-index: 10`; fica sobre o canvas, mas o canvas continua recebendo `mousedown` nas áreas visíveis → clique "não faz nada".
4. Só saem do estado pelos botões ENVIAR/IGNORAR. Se o `saveBtn` falhar (ver #22), o `await` pode nunca resolver (não há timeout) e `nameModal.style.display = 'none'` fica pendurado.
5. Sem `Escape` para fechar e sem `Enter` para enviar: só mouse.

### Plano de correção

1. **Substituir a guarda por uma decisão explícita:** `if (this.isAwaitingName) return;` com `isAwaitingName` setado/limpo nos handlers do modal — e, quando bloqueado, mostrar feedback (`instructions.textContent = 'Salve ou ignore sua pontuação para jogar de novo.'`).
2. **Fechar o modal no restart:** se o jogador tenta reiniciar com o modal aberto, tratar como "IGNORAR" (salvar é explícito). Ou remover a guarda e simplesmente esconder o modal no `restart()`.
3. Adicionar `Escape` → IGNORAR, `Enter` no input → ENVIAR, e `autofocus` correto (hoje `focus()` é chamado enquanto o modal está com `display:block`, tudo bem, mas o campo não tem `aria-label`).
4. Transformar em `<dialog>` nativo (foco preso, `Escape` de graça, `::backdrop`) — resolve acessibilidade e o empilhamento.
5. `AbortController` + `AbortSignal.timeout(8000)` no POST, e `finally { nameModal.style.display = 'none' }` independente do resultado.
6. Validar: pontuar → game over → apertar ESPAÇO (deve haver feedback ou reinício) → ENTER → clique (deve reiniciar).

**Esforço:** ~1 h. **Risco:** baixo.

---

<a id="bug-14"></a>
## 🟠 14 — Suíte E2E morta e apontando para o jogo antigo

**Arquivos:** `js/game.test.js` (310 linhas), `index.html`, `TEST_READY.md`

O `game.test.js` inteiro testa o **"Enzo Run"**, um motor que não existe mais:

| O teste procura | O código atual expõe |
|---|---|
| `window.enzoRunGame` | `window.flappyEnzoGame` |
| `#enzorun-canvas` 800×300 | `#flappyenzo-canvas` 400×500 |
| `#enzorun-container` | `#flappyenzo-container` |
| `#enzorun-score` | `#flappyenzo-score` |
| `game.hero.isJumping/vy/jumpForce` | `game.bird.velocity/jump/flap` |
| `game.obstacles`, `spawnObstacle()` | `game.pipes.array` |
| `game.update()`, `game.restart()` | existem, mas com outra semântica |

Além disso o arquivo **não é carregado por nenhuma página** — `index.html` só inclui `main.js` e `game.js`. O comentário do próprio teste diz *"Only run if `?test=true` is in the URL"*, mas o `<script>` que o incluiria foi removido. Conclusão: **zero cobertura de teste automatizado**, apesar do `TEST_READY.md` afirmar que a suíte está pronta e passa (13/13). Os relatórios em `.agents/` (reviewer_4, auditor_1) auditam esse estado inexistente — documentação ativamente enganosa.

### Plano de correção

1. Reescrever `js/game.test.js` contra a API real (`window.flappyEnzoGame`), com helpers de tick determinístico: em vez de `requestAnimationFrame`, chamar `game.update(dt)` com `dt` fixo (a refatoração de #05 torna isso possível e é pré-requisito).
2. Cobrir: spawn/reciclagem de canos, pontuação uma única vez por cano, colisão topo/base, teto e chão, pontuação máxima, ética do modal de game over, e **hitbox × desenho** (#09).
3. Carregar condicionalmente: `if (new URLSearchParams(location.search).has('test')) { import('./game.test.js') }` no `index.html`, ou um `test.html` dedicado que não vive em produção.
4. Adicionar `"test": "node --test test/"` no `package.json` com testes de Node puros para o que não é browser: `atualizar.js` (merge preservado — #06), `server.js` (validação de score — #02), magic numbers dos assets (#10).
5. Atualizar `TEST_READY.md` (ou apagá-lo) para não mentir, e marcar os relatórios de `.agents/` como históricos (#34).
6. Validar: `npm test` verde + `index.html?test=true` mostrando o relatório na tela.

**Esforço:** ~3–4 h. **Risco:** baixo (não toca produção).

---

<a id="bug-15"></a>
## 🟠 15 — Cache-busting por imagem × milhões de px de HQ

**Arquivo:** `js/reader.core.js` (linhas 99–118)

```js
coverImg.src = `${currentComic.cover}?t=${new Date().getTime()}`;
...
img.src = `${url}?t=${new Date().getTime()}`;
img.loading = index < 3 ? 'eager' : 'lazy';
```

Cada página recebe um `t` **único**, então **nenhuma** imagem é reaproveitada do cache HTTP — nem entre páginas, nem entre reloads, nem entre navegações "próximo capítulo" → "capítulo anterior". As HQs são enormes:

| Arquivo | Tamanho |
|---|---|
| `assets/Personagens/Cabo Côco.png` | 7,8 MB |
| `assets/Capitulo 6/Paginas/PAG5.png` | 7,6 MB |
| `assets/Capitulo 6/Paginas/PAG3.png` | 7,8 MB |
| `assets/Capitulo 5/Paginas/CAP5 PAG5.png` | 8,5 MB |
| `assets/Capitulo 1/Capa/Capa CAP1.png` | 10,4 MB |
| `assets/Capitulo 4/Paginas/CAP 4 PAG2.png` | 5,2 MB |

Um capítulo de 5 páginas + capa chega facilmente a **30–40 MB por leitura**, rebaixado integralmente a cada navegação, decodificado em memória em resolução total e pintado dentro de um `max-width: 800px`. Em celular isso é download longo, memória alta e risco real de o navegador descartar a aba.

Agravantes:
- `img.loading = index < 3 ? 'eager' : 'lazy'` — as 3 primeiras (as maiores, muitas vezes) são `eager` mesmo com zoom e viewport pequenos.
- Não há `width`/`height` nem `aspect-ratio` por página → **CLS** (a página "pula" conforme as imagens chegam).
- A capa também recebe `?t=`, e a mesma capa já é usada na home → baixada 2×.
- `elements.imageContainer.innerHTML = ''` a cada navegação de capítulo **sem remover `src`**, o que em alguns navegadores mantém as imagens vivas na memória por mais tempo.

### Plano de correção

1. **Remover o cache-busting de runtime.** Servir com `Cache-Control: public, max-age=31536000, immutable` e **versionar no nome** (`capa.CAP1.a1b2c3.png`) ou por um `?v=<hash do arquivo>` calculado no build por `atualizar.js`. Cache-busting por request é o antipadrão clássico.
2. **Otimizar os assets de verdade:** converter as HQs para **WebP/AVIF** (tipicamente 60–80% menores), gerar 2–3 larguras (`@1x`/`2x`) e servir via `srcset`; a arte em 800 px de exibição não precisa de 4000 px.
3. **Estados de carregamento:** `aspect-ratio` por página (o dado já existe — ler as dimensões no build e gravar em `database.json`), placeholder desfocado de baixo custo e esqueleto até o `onload`.
4. **Pré-carregar só o próximo:** `<link rel="prefetch">` do próximo capítulo em vez de `eager` nas 3 primeiras.
5. Medir antes/depois: DevTools → Network (transferido) e Lighthouse (LCP/CLS) em 4G simulado.

**Esforço:** ~4 h (build + pipeline de imagem). **Risco:** médio (precisa de plano B para `reader` de arquivos locais).

---

<a id="bug-16"></a>
## 🟠 16 — Cursores customizados são sobrescritos por `!important`

**Arquivo:** `css/style.css` (linhas 1507–1521), `degustador.html` (linhas 20–23)

```css
body, body * {
    cursor: url('../assets/cursors/cutlery.svg') 7 3, default !important;
}
body :is(a[href], button, ...) { cursor: url('../assets/cursors/pasta.svg') ... !important; }
```

`body *` + `!important` atinge **todo** elemento da página com a especificidade máxima permitida a um override autor. Consequências:

1. **O tema do Degustador nunca aplica o cursor do Batman.** O CSS nativo está lá em `body.theme-degustador, body.theme-degustador * {}` — mas o bloco está **vazio** (linhas 1457–1471). O `!important` global também venceria qualquer declaração não-`!important` posterior. O comentário em `degustador.html` ("Se a imagem quebrou, é porque o SO/Navegador ignorou a imagem gigante") descreve o sintoma errado: o problema é cascata, não o SO.
2. **Ergonomia ruim:** o cursor "macarronada" de 20×20 é aplicado inclusive sobre inputs e o `<select>`, e `body *` com `!important` força o cursor **em iframes/áreas de seleção de texto** (o `body :is(input, textarea)` sem `!important` na linha 1520 **perde** para a linha 1508 — logo, dentro de inputs o cursor também é macarronada, apesar da intenção declarada).
3. **Custo:** dois SVG são baixados e rasterizados em 3 tamanhos cada um, para todos os elementos. Aceitável, mas combinado com `body *` é o tipo de regra que aparece em bug de performance de mobile.
4. `resize_cursor*.ps1` e `remove_bg.js` geraram `assets/cursor-enzo.png`, que **não é referenciado em nenhum CSS** — código morto de um cursor abandonado.

### Plano de correção

1. **Restringir o alvo:** trocar `body, body *` por `body` (herança já cobre os filhos) e manter a lista explícita de interativos para o cursor "ativo".
2. **Remover o `!important`** das regras de cursor e usar `:where()` para cair a especificidade: `body :where(a, button, select, [onclick]) { cursor: url(pasta.svg) 20 20, pointer; }`.
3. **Implementar o tema degustador corretamente:** preencher o bloco vazio com `body.theme-degustador :where(...) { cursor: url('../assets/batman_cursor.png') 4 4, pointer; }` (o asset **existe**, 927 bytes) e remover o comentário enganoso do HTML.
4. Garantir que `input`/`textarea` recuperem `cursor: text` (sem `!important` do outro lado).
5. Decidir sobre `assets/cursor-enzo.png` + `remove_bg.js`/`resize_cursor*.ps1`: usar ou deletar junto com os caminhos absolutos de #33.

**Esforço:** ~45 min. **Risco:** baixo.

---

<a id="bug-17"></a>
## 🟡 17 — `.donation-footer` usa variáveis CSS inexistentes

**Arquivo:** `css/style.css` (linhas 4–26 `:root`, 1123–1197)

`--secondary-bg` e `--font-body` nunca são definidas (checado: 68 usos de `var()` no arquivo, nenhuma definição dessas duas). Resultado:

- `.donation-footer { background-color: var(--secondary-bg); }` → declaração inválida → **fundo transparente**; o rodapé fica por cima do padrão de bolinhas laranja do `body`, e a caixa `.donation-container` (`#111111`) flutua sem faixa de separação. Visual inconsistente com o resto do site.
- `.donation-text p` e `.pix-copy-btn` com `var(--font-body)` → caem para a fonte herdada. Hoje "funciona", mas qualquer mudança no `body` muda o rodapé por acidente.

Em **todos os 4 usos** a intenção é óbvia pelo contexto: `--bg-surface` (rodapé) e `--font-sans` (texto/botão).

### Plano de correção

1. Substituir `var(--secondary-bg)` → `var(--bg-surface)` e `var(--font-body)` → `var(--font-sans)`.
2. Alternativa mais robusta: **definir as variáveis** no `:root` (`--secondary-bg: #111111; --font-body: var(--font-sans);`) — não corrige a inconsistência, só a esconde; preferir a substituição.
3. Adicionar um teste de fumaça de CSS no build: varrer `css/*.css`, extrair todos os `var(--x)` e falhar se `--x` não estiver em `:root` nem definida inline. Isso pega essa classe de bug para sempre (é exatamente o que pegou #12 também).
4. Validar: rodar `getComputedStyle(document.querySelector('.donation-footer')).backgroundColor` e exigir um valor não-transparente.

**Esforço:** ~20 min. **Risco:** baixo.

---

<a id="bug-18"></a>
## 🟡 18 — Zoom do leitor não persiste e anima no lugar errado

**Arquivo:** `js/reader.core.js` (linhas 290–338, 741–800 do CSS)

- `currentZoom` é uma variável local: **resetada para 1.0 a cada navegação/reload**. Quem usa zoom para ler no celular precisa refazer o ajuste em cada capítulo.
- O CSS define `--zoom-level` no `#image-container` (`.image-container`), mas quem **usa** a variável é `.page-wrapper` e `.webtoon-image` (que estão dentro). Funciona por herança de custom property — porém `.reader-viewport` tem `align-items: center` e `padding: 20px`; ao passar de 100%, o conteúdo centralizado estoura para a direita e some sem aviso, e a rolagem horizontal só aparece se a largura do conteúdo realmente exceder o container (`width: 100%` no container limita antes).
- `changeZoom` faz clamp em `[0.5, 3.0]`, mas o **botão de reset** (`zoom-reset-btn`) mostra o percentual atual dentro de si, sem indicação de que clicar nele volta a 100% (só há `title`).
- Não há `Ctrl+scroll`/`pinch` no mobile nem atalho `+`/`-` (o teclado só tem `ArrowUp/Down`).
- `updateZoomUI()` é chamado no fim do `renderPage()`, então qualquer zoom anterior é apagado ao trocar de capítulo (reforça o primeiro item).

### Plano de correção

1. Persistir em `localStorage['reader-zoom']` e restaurar na inicialização (com clamp defensivo).
2. Mover `--zoom-level` para `document.documentElement` (`:root`) e calcular `max-width: calc(800px * var(--zoom-level))` no container também, garantindo que a rolagem horizontal exista de fato.
3. Quando `zoom > 1`, trocar `align-items` para `flex-start` e adicionar `overflow-x: auto` com `scroll-behavior: smooth` no `.reader-viewport`.
4. Aceitar `+`, `-`, `0` (reset) no teclado e `Ctrl/Cmd + wheel`; manter o clamp de 0.5–3.0.
5. Mostrar o nível de zoom como texto separado do botão de reset (ex.: `100%` clicável abre menu de presets 50/75/100/150/200%).
6. Validar: aplicar 150%, navegar para o próximo capítulo e confirmar que continua 150%; recarregar a página e confirmar persistência.

**Esforço:** ~1 h. **Risco:** baixo.

---

<a id="bug-19"></a>
## 🟡 19 — Seleção de capítulo consome o `<select>` como "gibi"

**Arquivo:** `js/reader.core.js` (linhas 78–87, 340–344), `data/database.json`

`populateChapterSelect()` popula o `<select>` com **todos os gibis** (`database.comics.forEach`), não com os capítulos do gibi atual. E o handler faz `window.location.href = 'reader.html?comic=' + selectedComicId` — um **reload completo** da página.

Problemas concretos:

1. O rótulo "Selecione o capítulo" (`aria-label` em `reader.html`) mente: são gibs/capítulos avulsos da série, **não** os capítulos do gibi atual. A confusão conceitual está no próprio comentário do código: *"cada 'Gibi' no banco de dados é na verdade um Capítulo da história"* — a modelagem está ambígua (o `degustador` é gibi; os `capitulo-N` são capítulos **e** gibis ao mesmo tempo).
2. O reload joga fora o zoom (#18), a posição de leitura e todo o trabalho do #15 (todas as imagens de novo — **sem** cache).
3. Não há estado de erro se `comicId` não existir na lista (ex.: URL antiga) — o `<select>` fica sem opção selecionada.
4. O `<select>` (`position: absolute` na ilha esquerda) com uma lista longa (20 capítulos possíveis pelo scanner de #07) fica impraticável no mobile.

### Plano de correção

1. **Decidir a modelagem:** um gibi tem N capítulos. Popular o `<select>` com `currentComic.chapters` e, se quiser navegar entre gibis, adicionar um segundo controle ("← Capítulo anterior / próximo →" já existe no rodapé do leitor).
2. Trocar o reload por **navegação interna**: extrair `loadComic(id, chapterId)` de `init()` e chamá-lo no `change`, atualizando `history.pushState` (sem recarregar).
3. Fallback de URL: se o capítulo não existir, selecionar o primeiro e mostrar aviso discreto em vez de redirect para a home.
4. No mobile, transformar o select em uma folha inferior (`<dialog>`/drawer) ou usar os botões prev/next existentes.
5. Validar: trocar o capítulo e conferir que o zoom persiste, que não há reload (Network) e que a URL muda corretamente (voltar/avançar do navegador funciona).

**Esforço:** ~2 h. **Risco:** médio (mexe na navegação principal do leitor).

---

<a id="bug-20"></a>
## 🟡 20 — Espaço sempre bloqueado, mesmo com o jogo fechado

**Arquivo:** `js/game.js` (linhas 463–474)

```js
window.addEventListener('keydown', (e) => {
    if (!this.isPlaying) return;
    if (e.code === 'Space') { e.preventDefault(); if (this.isGameOver) this.restart(); else this.bird.flap(); }
});
```

O `preventDefault()` está **depois** do `if (!this.isPlaying) return;` — ou seja, com o jogo fechado o espaço **não** é bloqueado. O problema é o **contrário** e mais sutil: enquanto o jogo está aberto (`isPlaying = true`), qualquer `Space` na página é engolido globalmente — inclusive se o foco estiver em outro controle (é o caso do input de nome do #13, que fica dentro do container: digitar um espaço no nome **não funciona** e ainda dá `flap`).

Além disso:

- O listener é registrado **uma vez** em `init()` e nunca removido; o `close()` não o desliga.
- Não há tratamento de `Enter`/`Escape` e nem `keyup` — o flap é no `keydown`, e o auto-repeat do teclado faz o pássaro "flutuar" segurando espaço.
-  `canvas.addEventListener('mousedown', ...)` sem checar `e.button` → clique com botão direito/middle também faz o pássaro voar (e abre o menu de contexto, quebrando o jogo).

### Plano de correção

1. Sair cedo quando o alvo do evento é um campo de texto: `if (e.target.closest('input, textarea, select, [contenteditable]')) return;`
2. Remover o listener no `close()` (guardar a referência) ou usar um `AbortController` por sessão de jogo — `this.inputAbort?.abort()`.
3. Usar `e.repeat === false` para evitar flap por auto-repeat (ou aceitar `repeat` deliberadamente e documentar).
4. Checar `e.button === 0` no `mousedown` e adicionar `canvas.addEventListener('contextmenu', e => e.preventDefault())`.
5. Validar: com o jogo aberto, digitar "A B" no input de nome deve preservar o espaço e não mover o pássaro.

**Esforço:** ~40 min. **Risco:** baixo.

---

<a id="bug-21"></a>
## 🟡 21 — `restart()` silenciosamente ignorado (retorno mudo)

**Arquivo:** `js/game.js` (linha 545)

```js
restart() {
    if (nameModal.style.display === 'block') return; // Bloqueia restart se modal estiver aberto
```

É a causa raiz do #13, mas vale o item próprio por ser um antipadrão recorrente no arquivo: o método **não retorna nenhum sinal** (nem `boolean`, nem rejeição, nem evento) e o chamador (`keydown`, `mousedown`, `touchstart`, `start()`) ignora o resultado. O chamador então assume que o jogo reiniciou. Quando o `start()` é chamado com o modal aberto (reabrir o jogo), o `restart()` interno é engolido e o jogo **abre já em game over** com o modal da sessão anterior na tela.

### Plano de correção

1. Substituir por estado explícito: `get canRestart() { return !this.isAwaitingName; }`, e no `start()` sempre **fechar o modal** e limpar `isAwaitingName` antes de `restart()`.
2. `restart()` deve retornar `true`/`false` e os chamadores logarem/ignorarem explicitamente.
3. Validar: pontuar, deixar o modal aberto, clicar em FECHAR, reabrir pelo logo → o jogo deve começar limpo em SCORE 0, sem modal.

**Esforço:** ~20 min. **Risco:** baixo.

---

<a id="bug-22"></a>
## 🟡 22 — Leaderboard sem tratamento de erro HTTP + corrida no botão ENVIAR

**Arquivo:** `js/game.js` (linhas 138–158, 634–654)

```js
const res = await fetch('/api/leaderboard');   // sem checar res.ok
const data = await res.json();
...
data.forEach(...)
```

- Se o servidor devolver HTML de erro (ex.: 500, página do Express), `res.json()` lança e o `catch` mostra *"Erro ao carregar o ranking."* — a mensagem genérica esconde a causa e não há log.
- `addEventListener('click', async …)` no `saveBtn` **não desabilita durante o fetch de verdade**: `saveBtn.disabled = true` só é aplicado depois de um par de operações síncronas, e o `innerText` é trocado depois de `disabled`. Um duplo clique rápido (mobile) envia o **mesmo placar duas vezes** — hoje, com o ranking público, o jogador aparece duplicado na lista.
- Não há `AbortController`/timeout: se o servidor travar, o botão fica "SALVANDO..." para sempre e o modal nunca fecha (#13).
- `entry.name` é injetado via `innerHTML` (`div.innerHTML = \`<span>${rankStr} ${entry.name}</span>...\``), com o nome vindo do **servidor**. A sanitização do servidor (`replace(/[^A-Z0-9 ]/g,'')`) protege hoje, mas a home confia num dado remoto para montar HTML — se #02 relaxar a validação (ou o `leaderboard.json` for editado à mão, o que é comum), temos XSS armazenado. Trocar por `textContent` custa nada.
- O ranking não mostra a data (`entry.date` existe no JSON) nem destaca a jogada atual.

### Plano de correção

1. `if (!res.ok) throw new Error(\`HTTP ${res.status}\`)` + `console.error` no `catch`, com mensagem de UI distinguindo "offline" de "servidor".
2. Desabilitar o botão **antes** do `await` (já está), impedir reentrada com uma flag `let saving = false;` e cobrir com `try/finally` garantindo o re-enable (inclusive no erro).
3. `AbortSignal.timeout(8000)`.
4. Substituir todo `innerHTML` com dados do usuário por `createElement`/`textContent` (ou `escapeHtml()`).
5. Sanitizar o `data/leaderboard.json` existente (3 entradas, uma com nome `ASS` — decidir se entra numa blocklist de nomes, já que o site é de família).
6. Validar: derrubar o servidor e conferir a mensagem; duplo clique e conferir um único envio; `POST` um nome com `<img onerror>` e conferir que aparece como texto.

**Esforço:** ~1 h. **Risco:** baixo.

---

<a id="bug-23"></a>
## 🟡 23 — Guarda de modal só olha `display === 'block'`

**Arquivo:** `js/game.js` (linhas 111, 528–545, 653–658)

O modal é controlado por `style.display` inline em três lugares (`'block'`, `'none'`, `'none'`) e a guarda compara a **string literal** `'block'`. Qualquer um destes quebra a lógica:

- `display: ''`/`flex`/`grid` (se o CSS mudar),
- um `classList.add('hidden')` futuro,
- o elemento removido do DOM (`document.body.contains` não é checado).

Além disso, `setGameOver()` **não fecha** o modal ao abrir um novo jogo, e o `nameInput.focus()` é chamado imediatamente após `display = 'block'` — em alguns navegadores o foco não pega porque o elemento ainda não foi "pintado"; o teclado virtual no mobile **não abre**, e o jogador não percebe que precisa digitar (precisa tocar no campo).

### Plano de correção

1. Trocar o boolean implícito por um estado no objeto `game` (`this.modalOpen = true/false`) — a fonte da verdade deixa de ser a string do `style`.
2. Melhor ainda: `<dialog>` com `.showModal()`/`.close()` e checar `dialog.open` (resolve #13 e #23 juntos).
3. Chamar `focus()` dentro de `requestAnimationFrame(...)` (ou usar `dialog.showModal()` + `autofocus`), garantindo o teclado virtual no mobile.
4. Validar: abrir no mobile e conferir que o teclado sobe; reabrir o jogo com modal pendente.

**Esforço:** incluído no #13. **Risco:** baixo.

---

<a id="bug-24"></a>
## 🟡 24 — `main.js` limpa o hero antes de validar os dados

**Arquivo:** `js/main.js` (linhas 30–38)

```js
const database = await response.json();
grid.innerHTML = '';
heroSection.innerHTML = '';        // ← apaga o hero ANTES de validar
if (database.comics.length === 0) { grid.innerHTML = '...'; return; }
```

`database.comics.length` vai lançar `TypeError` se o JSON não tiver o campo `comics` (ex.: arquivo truncado, `{}`, ou `null`). O `catch` trata, mas o hero **já foi apagado** → a home fica sem banner e sem grid, mostrando o card de erro (que é bom, ao menos). O `return` do caso vazio também deixa o **hero vazio** (nenhum `<div class="hero-banner">`), e o `game.js` (#04) injeta o container do jogo justamente em `#hero-comic` → com o hero vazio, o container fica lá sem banner para esconder.

Faltam também: validação de `Array.isArray(database.comics)`, validação de que cada comic tem `cover` existente, e fallback visual quando `cover` é `null` (o `database.json` pode ter capa só para o spin-off).

### Plano de correção

1. Validar **antes** de mexer no DOM: `if (!database || !Array.isArray(database.comics)) throw new Error('database.json inválido: campo "comics" ausente')`.
2. Mover `grid.innerHTML=''`/`heroSection.innerHTML=''` para depois da validação, e reusar os placeholders já presentes no HTML em vez de esvaziar.
3. Filtrar/validar itens: `comics.filter(c => c && c.id && Array.isArray(c.chapters))` com log dos descartados.
4. Cobrir com o teste de Node do #14 (validar o shape de `database.json` no CI).

**Esforço:** ~30 min. **Risco:** baixo.

---

<a id="bug-25"></a>
## 🟡 25 — Lógica de "LANÇAMENTO" só funciona com 6+ capítulos

**Arquivo:** `js/main.js` (linhas 40–86)

```js
// Como o Capítulo 5 já não é mais lançamento, só exibe no hero banner se houver um Capítulo 6+
if (enzoComics.length > 5) {
    latestComic = enzoComics[enzoComics.length - 1];
    gridComics = enzoComics.slice(0, -1);
}
```

Com o banco atual (`capitulo-1` … `capitulo-6`, 6 itens) a condição passa — **mas o disco não tem** `assets/Capitulo 6/Capa/CAP6 CAPA.png`… na verdade tem os arquivos do Cap 6, então hoje funciona. O bug é o **acoplamento a um número mágico**: se o dono adicionar um Capítulo 7, o Cap 6 sai do grid e vira banner (comportamento correto por acaso). Se **remover** páginas do Cap 6 (ex.: pasta vazia), o site volta para "PREPARANDO NOVO LANÇAMENTO..." e **esconde os 5 capítulos do hero** sem explicação.

Agravantes:

- O badge `LANÇAMENTO!` só existe no ramo do `latestComic`; no ramo `else` o badge é "EM BREVE" — e **esse é o estado permanente hoje** se o banco for reconstruído sem o Cap 6.
- `gridComics = enzoComics.slice(0, -1)` descarta o último item do grid; se o array vier fora de ordem (o scanner de #07 pode entregar ordem não numérica: `capitulo-1, capitulo-10, capitulo-2` por `.sort()` lexicográfico!), o "último" é o `capitulo-9` e o banner mostra o gibi errado.
- O `atualizar.js` usa `.sort()` **lexicográfico** em `readdirSync` — `CAP 4 PAG1.png`, `CAP 4 PAG2.png` estão OK hoje, mas `PAG10` viria **antes** de `PAG2`. Bug latente grave conforme o número de páginas cresce.
- O capítulo 5 ganha um wrapper especial (`wrapper.style.transform = 'scale(1.05)'`, `card.style.flex = '1'`) com `position`/`z-index` chapados, gerando layout diferente dos outros cards sem motivo visível.

### Plano de correção

1. Tirar o número mágico: derivar o lançamento de um campo explícito (`isLatest: true` em `data/comics.manual.json`) ou do **maior** `order` numérico parseado do id (`parseInt(id.replace(/\D+/g,''))`).
2. **Corrigir o `.sort()`** em `atualizar.js` para ordenação natural (`new Intl.Collator(undefined, { numeric: true }).compare`), garantindo `PAG2 < PAG10` e `Capitulo 2 < Capitulo 10`.
3. Remover o tratamento especial do `capitulo-5` (wrapper fantasma) ou explicá-lo com um comentário e movê-lo para CSS.
4. Se não houver lançamento novo, **não** esconder a coleção: manter o hero com o último capítulo e trocar o badge para "ÚLTIMO CAPÍTULO" (o contrário de "EM BREVE" permanente).
5. Validar: adicionar um `assets/Capitulo 7/Paginas/` com uma imagem e conferir que o Cap 7 vira banner e o grid ganha o Cap 6, sem duplicar nem sumir.

**Esforço:** ~1 h. **Risco:** médio (regra de negócio do dono).

---

<a id="bug-26"></a>
## 🟡 26 — Grid 3D do desktop é sobrescrito no mobile; hover preso em touch

**Arquivos:** `js/main.js` (linhas 122–143), `css/style.css` (linhas 842–905)

`main.js` registra `mousemove` em **todos** os cards, inclusive mobile. Em touch, alguns navegadores sintetizam `mousemove`/`mouseenter` no toque: o card recebe `transform` inline com `perspective(...) rotateX(...) rotateY(...)`, e o `mouseleave` **nunca** chega (não existe "sair" de um dedo) → o card fica torto e ampliado até o próximo toque em outra coisa.

No mobile, o CSS da media query define `.comic-book-style { animation: mobileFloat ... }` e o `transform` da animação **ganha** do inline? Não: inline vence animação em `@keyframes`? A regra real: `animation` sobrepõe `style.transform` durante a animação (animação tem precedência na cascata para propriedades animadas). Ou seja, o resultado é **imprevisível** entre navegadores: ora o card segue o dedo, ora segue o `mobileFloat`, dependendo da engine.

Ainda nesse bloco:

- As regras `.toolbar-center { display: none }` (linha 870) referenciam uma classe que **não existe em nenhum HTML** — CSS morto.
- `.reader-title { font-size: 1rem }` cai fora do media query justamente pelo `}` órfão de #12 — então no **desktop** o título do botão "Ler próximo" fica 1rem, e no mobile herda o tamanho de `.reader-title` global (que não existe) → inconsistência visual.
- O hover `.comic-book-style:hover` (perspective 1000px) com `transform-style: preserve-3d` e `::after`/`::before` produz 5 camadas por card; com 5-6 cards + 7 fichas de personagem, é bastante compositing em mobile.

### Plano de correção

1. Só registrar os listeners de 3D se houver mouse de verdade: `if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) { ... }`, e ainda assim `{ passive: true }`.
2. Usar `pointerenter`/`pointerleave` (que não são sintetizados no toque quando `pointerType === 'touch'`) e ignorar `e.pointerType === 'touch'`.
3. Resetar o `transform` inline no `pointercancel`, `touchstart` e `scroll`.
4. Remover `.toolbar-center` (código morto) e resolver o posicionamento de `.reader-title` dentro do bloco responsivo correto (depende de #12).
5. Validar: DevTools device mode (toque), arrastar o dedo sobre um card e confirmar que ele não fica torto; testar em 144 Hz e 60 Hz (#05) para o mesmo resultado de jogo.

**Esforço:** ~45 min. **Risco:** baixo.

---

<a id="bug-27"></a>
## 🟡 27 — Páginas caríssimas: capas/fichas gigantes e `innerHTML` com concatenação

**Arquivos:** `index.html` (linhas 49–74), `js/main.js` (linhas 54–120), `personagens.html` (linhas 151–191)

A **home** carrega no primeiro paint, entre outras coisas:

| Recurso | Peso |
|---|---|
| `assets/Capitulo 5/Capa/CAP5 CAPA.png` (hero/bg + cover) | 9,1 MB (baixada 2×: `src` + `background-image`) |
| `assets/Capitulo 6/Capa/CAP6 CAPA.png` | 8,9 MB |
| `assets/mp5k.png` | 0,7 MB |
| `assets/enzo_money.jpg` | 0,5 MB |
| `assets/macaroni_meatballs.jpg` (wipe de transição) | 1,4 MB |
| `assets/eye.jpg` (glitch do Cap 2) | 1,1 MB |
| `assets/flappy/bird.png` (jogo) | 0,4 MB |

São **~22 MB** de imagens para a home, boa parte em resolução de impressão. O hero ainda usa a mesma capa como `<img>` **e** como `background-image` (`hero-bg`), e cada card repete o padrão (capa no `background-image` **e** no `<img>`), dobrando o peso por card. A `personagens.html` é pior: 7 fichas de 5–8 MB cada = **~40 MB**.

Somando:

- `main.js` monta HTML por concatenação de template string com dados do `database.json` (`comic.title`, `comic.description`, `comic.cover`). O banco é local, mas é o mesmo antipadrão do #22: **se o dono colocar aspas num título**, o `onclick="..."` inline quebra (`localStorage.setItem('currentComicId', '${comic.id}')`). Usar aspas escapadas por `JSON.stringify` no atributo ou trocar por `addEventListener` (o card já tem `card.onclick` — o inline no hero é redundante).
- O hero usa `onclick` inline que **não** é `pointerdown`; em mobile o clique sintético após scroll pode disparar navegação acidental.
- `loading="lazy"` está no card, mas o hero/capa usam `eager` implícito — é a maior imagem da página.
- `personagens.html` não tem `loading="lazy"` em nenhuma das 7 fichas: **todas** são baixadas no load, mesmo as que estão 3 telas abaixo.
- `alt` está bom na maioria, mas `alt="Capa"` no hero é genérico e `alt="Teemo Hat"` (index linha 49) descreve a imagem errada (é a máscara/rosto do Degustador, não um chapéu do Teemo).

### Plano de correção

1. **Pipeline de imagens no build:** gerar versões web (`~800 px` de largura, WebP q80) para capas e fichas; manter os originais em `assets/_src/` fora do site público. Meta: home < 3 MB, personagens < 6 MB.
2. `loading="lazy"` + `decoding="async"` em **todas** as imagens de `personagens.html` (exceto a primeira), e `fetchpriority="high"` apenas no hero.
3. Remover a duplicação capa `background-image` + `<img>`: usar **só** o `<img>` com `object-fit: contain` e um `background: #111` sólido (o blur de fundo pode ficar com uma versão 32 px desfocada).
4. Trocar a montagem por `document.createElement` + `textContent` (ou `<template>` clonado), eliminando a interpolação em atributos.
5. Substituir os `onclick` inline do hero por `addEventListener` com `pointerup`.
6. Corrigir o `alt="Teemo Hat"`.
7. Medir com Lighthouse (mobile) antes/depois e registrar os números no README.

**Esforço:** ~3 h (build + revisão de imagens). **Risco:** médio (depende de decidir o que é arte-fonte).

---

<a id="bug-28"></a>
## 🟡 28 — `generateMask` monta 8,5M objetos em arrays 2D

**Arquivo:** `scripts/generate_mask_node.js` (linhas 134–160, 191–210)

```js
const rgbaGrid = [];
const lightMask = [];
for (let y = 0; y < height; y++) {
    rgbaGrid[y] = []; lightMask[y] = [];
    for (let x = 0; x < width; x++) {
        ...
        rgbaGrid[y][x] = { r, g, b, a };     // 1 objeto por pixel
```

Com a fonte real `Cabo Côco.png` = **1750×2432 = 4.256.000 px**, isso significa:

- **4.256.000 objetos** `{r,g,b,a}` no `rgbaGrid` (**+** os `lightMask` como arrays de boolean),
- mais ~4,2M de arrays pequenos (um por linha) e ~8,5M de slots.

Cada objeto pequeno no V8 custa ~32 bytes: estimativa de **300–500 MB** só nesse grid, mais picos do `zlib.inflateSync` do PNG (7,8 MB comprimido → dezenas de MB descomprimidos) e do `deflateSync` final. Node com heap padrão (~2 GB) pode segurar, mas em máquina apertada é `JavaScript heap out of memory` no meio do build, deixando um `cabo-coco.png` truncado (escrita é a **última** operação, então o risco de arquivo corrompido é baixo — mas o build quebra).

Note que o algoritmo é **correto** (flood fill pelas bordas + crop), só é memória-hostil: `visited` é `Array.from({length: height}, () => new Uint8Array(width))` (já tipado, bom) mas o grid de pixels não.

### Plano de correção

1. **Trocar os objetos por `Uint8ClampedArray(width * height * 4)`** — 17 MB no total, ~25× menos memória, e mantém o acesso `idx = (y*width + x) * 4`.
2. `lightMask` já pode ser `Uint8Array(width*height)` (1 byte/px).
3. Evitar decodificar PNG à mão: `sharp`/`pngjs` fazem isso em C com uma fração da memória. Se a dependência for indesejada, manter o decoder atual (é bem escrito) só com buffers tipados.
4. Não regravar o arquivo se o resultado for idêntico (comparar hash do buffer gerado com o existente) — evita o loop do watcher (#06) e o rebuild desnecessário.
5. Medir: `node --max-old-space-size=256 scripts/generate_mask_node.js` deve completar sem OOM (hoje falharia).
6. Validar: a máscara gerada deve ter alpha real (não ser uma cópia opaca) — assert `pngOutBuf` contém pixels com `a === 0`.

**Esforço:** ~1 h. **Risco:** baixo (o arquivo de saída deve ser idêntico).

---

<a id="bug-29"></a>
## 🟡 29 — Detecção de máscara por comparação de bytes

**Arquivos:** `server.js` (linhas 28–41), `atualizar.js` (linhas 22–35)

```js
const isOpaqueCopy = fs.existsSync(caboDst) && fs.existsSync(caboSrc) &&
                     fs.statSync(caboDst).size === fs.statSync(caboSrc).size;
if (!fs.existsSync(caboDst) || isOpaqueCopy) { /* regenera */ }
```

A intenção é detectar "o destino é uma cópia opaca do original" (o fallback de erro faz `fs.copyFileSync`). Mas o teste é **tamanho igual** — que é uma proxy ruim. O arquivo real hoje: fonte 7.820.625 bytes, destino 4.558.343 bytes → **nunca** regenera (comportamento certo por acidente). Se uma futura reexportação da arte gerar exatamente o mesmo tamanho — ou se o destino for editado à mão e voltar ao tamanho da fonte — o `copyFileSync` sobrescreveria a máscara boa por uma opaca e o `isOpaqueCopy` **não** detectaria na próxima execução (tamanhos iguais → regenera… na verdade detectaria; o pior caso real é o inverso: `caboDst` opaco com tamanho diferente → fica opaco **para sempre**).

Além disso a lógica está **duplicada** em `server.js` e `atualizar.js` (com o `try/catch` e o fallback de cópia copiados) — dois lugares para manter e divergir. E `server.js` roda isso **síncrono no boot**, o que hoje não dispara (tamanhos diferentes) mas com #28 resolvido ainda custaria segundos de startup se disparasse.

Também: `server.js` tem uma rota fallback dedicada (`/assets/Personagens/cabo-coco.png`, linhas 45–51) — resquício do problema de URL com acento. Bom, mas agora há **dois** caminhos servindo o mesmo arquivo (o estático e a rota) e a rota só cobre um caso; o correto é garantir que o `cabo-coco.png` exista.

### Plano de correção

1. **Detectar transparência de verdade:** decodificar o IHDR + checar `colorType` (6/4 tem alpha) e, idealmente, se existe algum pixel com `alpha === 0` (usa o resultado já disponível em memória no build — custo zero).
2. **Fonte única:** extrair a rotina para `lib/ensure-mask.js` e chamar de `atualizar.js` **apenas** (build), removendo o trabalho do boot do `server.js`. O servidor deve só servir arquivos; disponibilidade do asset é responsabilidade do build, com a rota fallback mantida como rede de segurança.
3. Gravar um sidecar `assets/Personagens/.cabo-coco-meta.json` com `{ sourceMtimeMs, sourceSize, outHash }` para decidir "precisa regerar?" com precisão.
4. Validar: apagar `cabo-coco.png`, rodar `npm run build`, conferir que foi gerado com alpha; rodar de novo e conferir que **não** regerou (log explícito "máscara atualizada em cache").

**Esforço:** ~1 h. **Risco:** baixo.

---

<a id="bug-30"></a>
## 🔵 30 — `touchstart` com `preventDefault` sem `passive:false`

**Arquivo:** `js/game.js` (linhas 485–493)

```js
canvas.addEventListener('touchstart', (e) => {
    if (!this.isPlaying) return;
    e.preventDefault();          // ← precisa de { passive: false }
    ...
});
```

Chrome trata `touchstart`/`touchmove`/`wheel` como passivos por padrão. Um `preventDefault()` num listener passivo **não tem efeito** e emite o aviso *"Unable to preventDefault inside passive event listener invocation"* no console — então a rolagem da página **não** é bloqueada durante o jogo, exatamente o que o `preventDefault` queria evitar. O jogador toca para voar e a página rola.

### Plano de correção

1. `canvas.addEventListener('touchstart', handler, { passive: false })`.
2. Melhor: trocar por **Pointer Events** (`pointerdown`) com `touch-action: none` no CSS do canvas — resolve mouse/touch/caneta de uma vez e elimina os handlers duplicados de `mousedown` + `touchstart` (que hoje disparam os dois em alguns dispositivos → dois flaps por toque). Verificar também #20 (`e.button`).
3. Validar: no device mode com toque, tocar no canvas e confirmar que a página **não** rola e que o pássaro dá **um** flap por toque.

**Esforço:** ~20 min. **Risco:** baixo.

---

<a id="bug-31"></a>
## 🔵 31 — Versões de script inconsistentes entre páginas

**Arquivos:** `index.html` (78–80), `degustador.html` (132), `reader.html` (19, 72)

| Página | Tag | Versão |
|---|---|---|
| `index.html` | `js/main.js?v=15` | 15 |
| `degustador.html` | `js/main.js?v=27` | **27** |
| `index.html` | `js/game.js?v=25` | 25 |
| `personagens.html` | `js/game.js?v=25` | 25 |
| `reader.html` | `js/reader.js?v=37` e `js/reader.core.js?v=7` | 37 / 7 |
| CSS em todas | `css/style.css?v=20260910` | data fixa |

O **mesmo arquivo** (`js/main.js`, `js/game.js`) é referenciado com números de versão diferentes em páginas diferentes. Como o query param é a chave de cache, cada página terá sua **própria cópia em cache** do mesmo arquivo — na prática, o usuário pode rodar `main.js` v15 na home e v27 no Degustador (mesmo código, mas dois downloads e dois caches). Pior: ao publicar uma correção, é fácil atualizar a versão numa página e esquecer outra, servindo código velho em cache **sem nenhum sinal**.

Além disso, `?v=20260910` no CSS é uma data "futura" (10/09/2026) escrita à mão — mais um número que precisa ser lembrado.

### Plano de correção

1. Escolher **uma** estratégia: (a) hash automático no build (`main.a1b2c3.js` gerado por um passo de build), ou (b) cache headers corretos (`Cache-Control: no-cache` para HTML e `immutable` para assets versionados) e **remover todos os `?v=`**.
2. Se mantiver o `?v=` manual (aceitável para um projeto pequeno), centralizar num único "bump" que reescreve os 4 HTMLs — e nunca ter o mesmo arquivo com dois números.
3. Enquanto isso, corrigir já a inconsistência: `main.js` em `degustador.html` → mesmo `?v=` do `index.html`.
4. Validar: DevTools → Network, filtrar `main.js` e conferir **uma** entrada com `(disk cache)` ao navegar entre páginas.

**Esforço:** ~30 min (ou ~2 h com build de hash). **Risco:** baixo.

---

<a id="bug-32"></a>
## 🔵 32 — `degustador.html` linka para gibi inexistente

**Arquivos:** `degustador.html` (linha 69), `data/database.json`

```html
<button class="hero-btn" onclick="playMacaroniTransition('reader.html?comic=degustador&chapter=1')">
```

No `database.json` atual **não existe** o comic `degustador` (só `capitulo-1..6`). Logo, o botão "Ler Lançamento" navega para o leitor, que não acha o comic e faz `window.location.href = 'index.html'` (`reader.core.js` linha 52) — ou seja, **o botão principal da página do Degustador chuta o usuário de volta para a home**, sem mensagem. É o sintoma visível de #07 (o dado não é gerado) e de #06 (o dado manual foi ou será apagado pelo build).

Some-se que a seção "Edições Completas" e os 4 placeholders `?` estão `display: none` e o `<h2>` idem — conteúdo escondido por decisão, sem problema, mas o `hero-badge` diz "LANÇAMENTO" enquanto o `?v=27` do `main.js` sugere que a página foi editada depois da home.

### Plano de correção

1. Resolver na origem: garantir que o comic `degustador` exista no banco depois de todo build (ver #07 + #06).
2. Melhorar o erro: quando `currentComic` não for encontrado, mostrar "Este capítulo ainda não está disponível. [Voltar]" em vez de redirecionar sem explicação.
3. Adicionar um teste (Node, #14) que valide **todo** `reader.html?comic=X` referenciado nos HTMLs contra os ids presentes em `database.json` — pega esse bug e qualquer link futuro quebrado de uma vez.
4. Validar: clicar em "Ler Lançamento" e ver o Cap 1 do spin-off renderizado (não a home).

**Esforço:** ~30 min (depende de #07). **Risco:** baixo.

---

<a id="bug-33"></a>
## 🔵 33 — Scripts utilitários órfãos e caminhos absolutos antigos

**Arquivos:** `remove_bg.py`, `remove_bg.ps1`, `remove_bg.js`, `process_images.py`, `resize_cursor.ps1`, `resize_cursor_transparent.ps1`

Todos contêm **caminhos absolutos hardcoded da máquina antiga**:

```
C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader\assets\...
C:\Users\Henrique\.gemini\antigravity\brain\68daf0f5-.../media__...png
```

Nenhum roda mais (a pasta mudou para `D:\Media\imagens\Enzo Games Shit\Enzo Games SITE\comic-reader`), e vários se sobrescrevem (`remove_bg.py` e `remove_bg.ps1` fazem o mesmo flood fill nas mesmas duas imagens). Outros problemas:

- `remove_bg.py` (linhas 32–47) faz o **bounds check depois** de usar `pixels[x, y]`: uma coordenada fora da imagem dispara `IndexError`, capturado pelo `except` externo que imprime "Error ..." — o processo continua com a imagem **meio processada** (as bordas já foram apagadas antes do erro). Ordem errada: validar `x/y` **antes** de acessar.
- `remove_bg.py` **sobrescreve o fonte** (`img.save(path)`) — sem backup. Rodar 2× degrada a imagem? Não (idempotente para branco), mas é irreversível se a lógica estiver errada.
- `process_images.py` **ignora o `.png` de saída do pipe** e salva sempre como PNG — é a provável origem do `pipe.png` ser JPEG (#10) ou da perda do alpha.
- `remove_bg.js` depende de `jimp` (está em `dependencies`) para gerar um cursor que **não é usado** (#16).
- `resize_cursor*.ps1` também apontam para o caminho antigo e usam `Add-Type -ReferencedAssemblies System.Drawing`, que **não funciona** no PowerShell 7 (`pwsh`) do Windows moderno (o assembly é `System.Drawing.Common`, e em .NET Core exige o pacote). Script morto.

### Plano de correção

1. **Decidir o que vive:** manter apenas um script de preparação de imagem, com caminhos relativos (`path.join(__dirname, ...)`) e CLI (`node tools/prepare-assets.js --in ... --out ...`).
2. Apagar os 5–6 scripts duplicados/obsoletos e a dependência `jimp` (se ninguém usar) — ou documentar em `tools/README.md` para que servem.
3. Corrigir o bounds check e passar a escrever em arquivo novo (nunca sobrescrever a arte-fonte).
4. Migrar para Node (o projeto já é Node) usando `sharp`/`jimp` — um só runtime, funciona em qualquer SO, sem `System.Drawing`.
5. Validar: rodar o script numa cópia limpa e conferir a saída sem depender de caminho absoluto.

**Esforço:** ~1,5 h. **Risco:** baixo.

---

<a id="bug-34"></a>
## 🔵 34 — `.agents/` versiona 40+ relatórios desatualizados e contraditórios

**Diretório:** `.agents/` (44 arquivos, ~150 KB)

Contém `ORIGINAL_REQUEST.md`, `BRIEFING.md`, `handoff.md`, `review.md`, `audit.md`, `progress.md` de ~14 agentes de execuções antigas. Problemas:

- **Contradizem o código atual.** O handoff do orquestrador afirma que `<script src="js/reader.js">` foi removido de `reader.html` — está lá (#01). `reviewer_4` e `auditor_1` dão "APPROVE"/"CLEAN" para um `game.js` que **não existe mais** (auditam `game.hero`, `assets/enzorun/`, `localStorage['enzorun-highscore']`). `TEST_READY.md` afirma 13/13 testes passando.
- **Caminhos absolutos** de outra máquina em praticamente todos.
- Um agente futuro (ou o próprio dono) que ler esses arquivos concluirá que o projeto está saudável e que features existem quando não existem.

### Plano de correção

1. Mover para `docs/historico/` (ou deletar) e adicionar um `HISTORICO.md` com uma linha por execução antiga + um aviso grande no topo: *"Documentos históricos. Não refletem o estado atual. Ver BUG_REPORT.md."*
2. Adicionar `.agents/` ao `.gitignore` se a pasta continuar sendo usada por ferramentas de agente (não versionar saída de execução).
3. Manter apenas o que tem valor permanente: `ORIGINAL_REQUEST.md` (requisitos!) — que é justamente o documento que prova o bug #04.
4. Validar: `grep -r "enzorun" .agents/` só deve retornar arquivos explicitamente marcados como históricos.

**Esforço:** ~20 min. **Risco:** baixo.

---

# Plano de execução sugerido

Ordem pensada para **destravar valor cedo** e não empilhar riscos. Cada fase termina com um critério de aceite verificável.

### Fase 0 — Destravamento (½ dia)
Corrigir o que está **quebrado na cara do usuário** e é de baixo risco:

| Ordem | Bug | Ganho |
|---|---|---|
| 1 | [#12](#bug-12) CSS `}` órfão + vars inexistentes ([#17](#bug-17)) | Transições voltam a funcionar; rodapé correto |
| 2 | [#01](#bug-01) remover `reader.js` duplicado | Leitor 2× mais rápido, teclado deixa de piscar |
| 3 | [#04](#bug-04) jogo inalcançável | Feature principal volta a existir |
| 4 | [#10](#bug-10)/[#03](#bug-03) sprite do cano | O jogo fica jogável de verdade |
| 5 | [#31](#bug-31) versões de script | Fim do "cache velho" fantasma |

**Aceite:** abrir a home, clicar no logo, jogar 30 s sem morrer no invisível, ler o Cap 5 sem piscar a UI.

### Fase 1 — Confiabilidade do jogo (1 dia)
[#05](#bug-05) delta time → [#09](#bug-09) hitbox = desenho → [#13](#bug-13)/[#21](#bug-21)/[#23](#bug-23) modal e restart → [#20](#bug-20)/[#30](#bug-30) input → [#11](#bug-11) `bg` → [#22](#bug-22) leaderboard client-side.
**Aceite:** mesmo comportamento em 60/144 Hz (teste automatizado), sem softlock, sem 404.

### Fase 2 — Pipeline de conteúdo (1–2 dias)
[#06](#bug-06) merge preservando manual → [#07](#bug-07) spin-off → [#08](#bug-08) easter egg → [#32](#bug-32) link do Degustador → [#28](#bug-28)/[#29](#bug-29) máscara em buffer tipado + detecção por alpha → [#33](#bug-33) limpeza dos utilitários.
**Aceite:** `npm run build` é **idempotente** (`git diff data/database.json` vazio) e o spin-off continua acessível depois dele.

### Fase 3 — Performance do site (1–2 dias)
[#15](#bug-15) cache/`?t=` e WebP → [#27](#bug-27) imagens web e lazy load → [#19](#bug-19) navegação interna de capítulo → [#18](#bug-18) zoom persistente.
**Aceite:** home < 3 MB, personagens < 6 MB, reload do leitor servido do cache, LCP < 2,5 s em 4G simulado.

### Fase 4 — Blindagem (1–2 dias)
[#02](#bug-02) validação do leaderboard → [#14](#bug-14) suíte de testes reescrita + `npm test` → [#24](#bug-24)/[#25](#bug-25)/[#26](#bug-26) robustez do `main.js` → [#16](#bug-16) cursores/tema → [#34](#bug-34) limpeza de `.agents/`.
**Aceite:** `npm test` verde no CI local; `POST` inválido retorna 400; nenhum documento do repositório contradiz o código.

### Fase 5 — Polimento
Bugs 🔵 restantes ([#31](#bug-31) se não feito, [#32](#bug-32) residual) + telemetria simples de erro (`window.onerror` → log no servidor) para que os próximos bugs não fiquem invisíveis.

---

# Verificações rápidas (pré-flight de cada deploy)

- [ ] `node -c js/*.js server.js atualizar.js watch.js scripts/*.js` sem erro de sintaxe
- [ ] Nenhum 404 no DevTools → Network (home, leitor de cada capítulo, Degustador, Personagens, jogo)
- [ ] DevTools → Console sem erros e **sem avisos de `preventDefault` passivo**
- [ ] `npm run build` **duas vezes** → `git status data/database.json` limpo
- [ ] Leitor: capa aparece, `ArrowUp` esconde a UI e ela **fica** escondida
- [ ] Jogo: abrir pelo logo → jogar → game over → salvar → reabrir pelo logo → SCORE 0
- [ ] `curl -s -X POST localhost:3000/api/leaderboard -H 'Content-Type: application/json' -d '{"name":"X","score":999999}'` → **400**
- [ ] Validador de CSS sem erros de sintaxe (pega a classe do #12)
- [ ] `grep -rn "var(--" css/` → toda variável existe em `:root` (pega a classe do #17)
