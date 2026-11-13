# Relatório Caça-Bugs — Agente 4 (Leitor, home, admin, páginas e CSS)

Escopo auditado:
- JS: `js/reader.core.js`, `js/main.js`, `js/shelf.js`, `js/comic-open.js`, `js/site.js`, `js/os.js`, `js/os-equipe.js`, `js/os-gibis.js`, `js/midia.js`, `js/characters.js`, `js/admin.js`, `js/admin-upload.js`, `js/admin-fx.js`, `js/lancamentos.js`, `js/musicas.js`, `js/zezoverso-musicas.js`, `js/intro-diaria.js`, `js/movimento.js`.
- HTML raiz (exceto `batalha.html` e `italos-surfer.html`): `index.html`, `reader.html`, `admin.html`, `404.html`, `degustador.html`, `personagens.html`, `terminal.html`, `zezoverso.html`.
- CSS: `css/*` (exceto `css/batalha.css`).

---

## 1. Bugs confirmados e corrigidos

### 1.1 `js/reader.core.js:583-590` — Navegação por setas no painel de capítulos nunca era registrada
- **Bug**: `setupEventListeners()` (chamada no `init()`, antes de `loadComic()`) executava `recordatorio.querySelector('.capitulos-painel')?.addEventListener('keydown', ...)`. Porém `.capitulos-painel` só é criado depois, dentro de `buildChapterPanel()` durante `loadComic()`. Como a query retornava `null`, o listener de `ArrowDown`/`ArrowUp` nunca era anexado.
- **Reprodução**: Abrir `reader.html`, focar `.reader-chapter-info`, pressionar `Enter` ou `ArrowDown` para abrir a lista de capítulos e pressionar `ArrowDown`/`ArrowUp` novamente — o foco não se move entre os capítulos.
- **Correção**: Delegado o evento `keydown` diretamente em `recordatorio`, filtrando por `event.target.closest?.('.capitulos-painel')`.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`reader.core.js: não reaproveita currentChapterId de outro gibi, delega setas do painel e cria ampliar após load`).

### 1.2 `js/reader.core.js:694-700` — Vazamento de `currentChapterId` entre gibis e índice `undefined`
- **Bug**: Ao abrir um gibi direto pela URL sem `&chapter=` (ex.: `reader.html?comic=superkid` como em `index.html`), `loadComic()` fazia `chapterId || localStorage.getItem('currentChapterId') || comic.chapters?.[0]?.id`. Se o leitor tivesse lido outro gibi antes (cujo capítulo tivesse ID coincidente, ex.: `'2'`), abria no capítulo errado. Além disso, `index === -1 ? 0 : index` deixava `state.chapterIndex` como `undefined` caso `comic.chapters` fosse ausente.
- **Reprodução**: Gravar `currentComicId='degustador'` e `currentChapterId='cap-2'` no `localStorage`, navegar para `reader.html?comic=superkid` (onde `superkid` também possui `cap-2` como segundo capítulo): abria em `cap-2` em vez do primeiro capítulo.
- **Correção**: Só reutiliza `localStorage.getItem('currentChapterId')` quando `comic.id === localStorage.getItem('currentComicId')`, e normaliza `state.chapterIndex = index > -1 ? index : 0`.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`reader.core.js: não reaproveita currentChapterId de outro gibi, delega setas do painel e cria ampliar após load`).

### 1.3 `js/reader.core.js:402-411` — Botão "Ampliar" ausente em páginas deitadas fora de `SiteImages`
- **Bug**: `renderChapter()` checava `if (image.width > image.height)` de forma síncrona logo após criar o `<img>`. Quando a imagem não possui entrada em `SiteImages` (atributos `width`/`height` ainda `0`), `0 > 0` é falso e páginas horizontais nunca recebiam o botão de tela cheia no celular.
- **Reprodução**: Renderizar página paisagem cujo caminho não tenha dimensões prévias em `SiteImages`: após carregar com `naturalWidth > naturalHeight`, `.page-expand-btn` não aparece.
- **Correção**: Quando `!image.width && !image.height`, anexar listener `{ once: true }` em `load` para checar `image.naturalWidth > image.naturalHeight` e inserir `buildExpandButton(url, index)`.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`reader.core.js: não reaproveita currentChapterId de outro gibi, delega setas do painel e cria ampliar após load`).

### 1.4 `js/comic-open.js:110-111` — Caminho relativo em `--cover` resolvido a partir de `css/`
- **Bug**: `book.style.setProperty('--cover', url("${coverSrc}"))` recebia caminhos relativos quando `coverImg.currentSrc` ainda estava vazio (clique rápido / imagem lazy), como `assets/...` vindo de `siteImageUrl(...)`. Como `css/style.css:1629` e `css/style.css:1640` consomem `var(--cover)` dentro da folha `css/`, o navegador resolvia o `url()` relativo a `css/` (`css/assets/...` → 404).
- **Reprodução**: Chamar `EnzoOpen.fly` com `coverSrc` relativo (`assets/capa.png`); `--cover` ficava `url("assets/capa.png")` em vez de absoluto contra `document.baseURI`.
- **Correção**: Resolver `coverSrc` via `new URL(String(coverSrc), document.baseURI).href` quando não vazio.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`comic-open.js: resolve caminho relativo de --cover contra document.baseURI`).

### 1.5 `js/midia.js:140-147` — Race condition ao arrastar barra de progresso de outra faixa
- **Bug**: Ao arrastar `.vinil-barra` de uma faixa B enquanto a faixa A tocava, `tocar()` iniciava a troca de `audio.src`, mas `if (audio.duration) ir()` podia ler o `audio.duration` antigo da faixa A no mesmo tick ou disparar um listener `loadedmetadata` pendente numa troca rápida para a faixa C.
- **Reprodução**: Com Faixa A tocando (`duration = 180`), disparar `input` na barra da Faixa B com `value = 500`: `audio.currentTime` era alterado usando a duração da Faixa A antes de os metadados da Faixa B carregarem.
- **Correção**: Guardar `eraAtual = ehAtual(faixa)` antes de `tocar()`, checar `ehAtual(faixa)` dentro de `ir()` e só fazer seek imediato se `eraAtual && audio.duration`.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`midia.js: evita seek com duração da faixa anterior e ignora resize com cinema oculto`).

### 1.6 `js/midia.js:331-337` — `desenharFeixe()` gravava `viewBox="0 0 0 0"` com cinema oculto
- **Bug**: No evento `resize`, se `cinema.atual >= 0` mas a aba/seção da Videoteca estava oculta (`getBoundingClientRect()` com `0×0`), `desenharFeixe()` sobrescrevia o SVG com `viewBox="0 0 0 0"` e polígono zerado (ou lançava erro se `.projetor-lente` não existisse).
- **Reprodução**: Selecionar uma fita e disparar `resize` enquanto o contêiner de cinema tem `0×0`.
- **Correção**: Retornar imediatamente em `desenharFeixe()` se `!base.width || !base.height || !t.width || !t.height || !lente`.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`midia.js: evita seek com duração da faixa anterior e ignora resize com cinema oculto`).

### 1.7 `js/os-equipe.js:142-144` e `js/os-gibis.js:12-17, 54-56, 70-72` — Requisição `/undefined` quando falta `cover`
- **Bug**: Em `os-equipe.js` (`cartaoDe`) e `os-gibis.js` (`miniUrl` / `estante` / `capitulos`), quando um gibi ou capítulo não possuía `cover`, `img.src = undefined` e `encodeURI(undefined)` geravam `src="undefined"` e `background-image: url("undefined")`, disparando requisições 404.
- **Reprodução**: Montar lista com gibi `{ id: 'sem-capa', chapters: [{ id: '1', pages: [] }] }` sem propriedade `cover`.
- **Correção**: Retornar `''` em `miniUrl` quando `!caminho` e só atribuir `img.src` / `capa.style.backgroundImage` quando a origem existir.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`os-equipe.js e os-gibis.js: capítulo ou gibi sem cover não requisita /undefined`).

### 1.8 `js/characters.js:173-188` — Trava permanente de `voando` se `Element.animate().finished` rejeitar
- **Bug**: Em `abrir()` e `fechar()`, `voando = null` ficava depois de `await voando` sem `try/finally`, e `fechar()` não checava `clone` antes de animar. Se a Web Animation rejeitasse (ex.: aba oculta/interrupção), `voando` ficava preso não-nulo e travava a galeria indefinidamente (`if (aberto || voando) return`).
- **Reprodução**: Simular rejeição de `el.animate().finished` ao abrir uma estátua e em seguida clicar em fechar.
- **Correção**: Envolver `await voando` em `try ... catch {} finally { voando = null; }` em `abrir()` e `fechar()`, e guardar `if (clone)` em `fechar()`.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`characters.js: animação rejeitada em voar não trava o estado voando da galeria`).

### 1.9 `css/style.css:1804-1890` (reportado pelo Agente 2 / pedido #9) — Overflow horizontal de `.cacada-controles--v2` em celular `375px` retrato
- **Bug**: Dentro de `.game-dialog` (`width: 100vw`, `padding: 16px` -> `343px` úteis), `.cacada-controles--v2` recebia `padding: 0 4px` (`335px`), `.cacada-analogico` fixo em `width: 160px; flex: none`, `gap: 8px` e `.cacada-acoes` com `grid-template-columns: repeat(3, auto)` e `.cacada-botao--menor` com `min-width: 52px` (`gap: 6px`), somando `160 + 8 + (3 * 52 + 12) = 336px+` (e maior ainda pela largura do rótulo `RAJADA` + bordas), estourando os `335px` úteis no sentido horizontal.
- **Reprodução**: Abrir a Caçada ao Inominável em tela de toque `375px` retrato (`max-width: 560px` e `orientation: portrait`).
- **Correção**: No bloco `@media (max-width: 560px)`, ajustar `.cacada-controles` (`gap: 6px; padding: 0`), `.cacada-acoes` (`flex: 1; min-width: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px`), `.cacada-acoes .cacada-botao--menor` (`min-width: 0; padding: 0 2px; font-size: 0.72rem`) e `[data-tecla="golpe"]`/`[data-tecla="pulo"]` (`min-width: 0; padding: 0 4px; font-size: 1.15rem`), além de `@media (max-width: 560px) and (orientation: portrait)` reduzindo `.cacada-analogico` para `132px × 132px` (`.cacada-analogico__base` `96px`, `.cacada-analogico__pino` `44px`) — sobrando `205px` (`~65px` por coluna de ação) dentro dos `343px` sem interferir nos controles de paisagem.
- **Teste que prova**: `test/caca-bugs-agente4.test.js` (`css/style.css: controles v2 da Caçada cabem dentro dos 343px úteis de um celular 375px em retrato`).

---

## 2. Suspeitas anotadas (não editadas)

- **`js/main.js:359-376` (`esperandoLogin`)**: Ao clicar na Caçada deslogado, `esperandoLogin = 'ronda'` é gravado e um listener `conta.aoMudar(...)` abre o jogo assim que houver login. Se o usuário fechar o convite ("Agora não") e mais tarde clicar em "Entrar" no cabeçalho para outro fim (ex.: comentar), `esperandoLogin` ainda estará `'ronda'` e abrirá a Caçada inesperadamente. Não editado porque o modal `.conta-convite` e seu fechamento pertencem a `js/auth-widget.js` (fora do escopo do Agente 4).
- **`js/os-gibis.js:94-95` (`URL.createObjectURL`)**: `urlDe(file)` armazena `file._url = URL.createObjectURL(file)` e nunca chama `URL.revokeObjectURL` ao trocar de capítulo ou sair do app; risco baixo de retenção de memória apenas em sessões longas de admin.

---

## 3. Verificações estáticas e testes da área

- **Links/assets estáticos (HTML, CSS e JS do escopo)**: Todos os caminhos relativos existem em disco (as únicas ocorrências apontadas no scan estático foram exemplos literais `x.mp4`/`x.webp` em `js/midia.js`, `/` em `404.html`, `%23n` de SVG inline em `css/style.css` e `/assets/ui/icones/*.svg` em `css/icones.css`, sendo confirmada a presença dos 19 arquivos em `assets/ui/icones/`).
- **Checagem de `EnzoConta.aoMudar` (`js/auth-widget.js:20`, fora do escopo)**: Confirmado que `avisar()` passa `api` (`conta`) como primeiro argumento aos callbacks, portanto `js/characters.js:61-64` e `js/characters.js:206-213` funcionam corretamente.
- **Baseline pré-existente (conforme `docs/caca-bugs/linha-de-base.md`)**: `test/catalog.test.js` (7 testes) e `test/musicas.test.js` (1 teste) falham pela ausência de `data/database.json` (build não executado por instrução), e `test/pipeline.test.js` falha em `capas: 5236360`.
- **Resultado dos testes da área após última edição** (`node --test test/shelf.test.js test/catalog.test.js test/intro-diaria.test.js test/lancamentos.test.js test/musicas.test.js test/admin*.test.js test/pipeline.test.js test/caca-bugs-agente4.test.js`):
  - **Total**: `44` testes, **`35` passaram**, **`9` falharam** (`0` pulados/cancelados).
  - Passaram `6/6` em `test/caca-bugs-agente4.test.js`, além de `100%` em `test/shelf.test.js`, `test/intro-diaria.test.js`, `test/lancamentos.test.js` e `test/admin*.test.js` e o primeiro teste de `test/pipeline.test.js`.
  - As `9` falhas são exatamente as da linha de base (`docs/caca-bugs/linha-de-base.md`): `7` em `test/catalog.test.js` e `1` em `test/musicas.test.js` por ausência de `data/database.json`, e `1` em `test/pipeline.test.js` (`capas: 5236360`).
