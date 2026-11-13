# Relatório Caça-Bugs — Agente 2 (Jogos: Caçada, Flappy, Italo's Surfer)

Escopo auditado:
- Caçada ao Inominável (`js/cacada*.js`)
- Flappy Enzo (`js/flappy*.js`, `assets/flappy/game/sprites.json`)
- Italo's Surfer (`italos-surfer.html`, `assets/italos-surfer/*`)
- Integração compartilhada (`js/game-dialog.js`, `js/jogos-home.js`) e checagem de assets/CSS (`css/style.css` somente leitura)

---

## 1. Bugs corrigidos (no escopo)

### 1.1 `js/cacada-core.js:853` (e `:658`, `:783`, `:845`) — `apoiado()` e estado `'carregando'` ignoravam plataformas móveis (`M`)
- **Bug**: `apoiado(mundo, j, t)` checava apenas tiles sólidos e marquises (`'='`), ignorando `mundo.nivel.plataformas` apesar de receber `t` e ter o contrato *"Tem chão (sólido, marquise ou plataforma) logo embaixo dos pés?"*. Além disso, no estado `'carregando'` (carga do **Buzz!**), o jogador não era carregado horizontalmente pela plataforma móvel (`j.plataforma`), enquanto o movimento normal executava esse deslocamento.
- **Como reproduzir / por que é bug**:
  1. Ao pousar em uma plataforma móvel `M` e iniciar o carregamento de **Buzz!** (`baixo` + `dash`), `apoiado(mundo, j, t)` retornava `false` no primeiro quadro e cancelava a carga imediatamente; e mesmo com `apoiado` corrigido, durante os 0,6 s de carga a plataforma deslizava para fora dos pés do jogador por falta de acompanhamento horizontal.
  2. Ao dar **dash** em cima de uma plataforma móvel `M`, `j.noChao = apoiado(mundo, j, t)` zerava `j.noChao`, `j.coiote` e `j.dashDisponivel` já no primeiro quadro sobre a plataforma.
- **Correção feita**:
  - `apoiado(mundo, j, t)` agora verifica também `mundo.nivel.plataformas` via `posPlataforma(p, t)` com tolerância de 1 px nos pés (`base >= q.y - 1 && base <= q.y + 1 && j.x + L > q.x && j.x < q.x + q.w`).
  - Extraído o helper local `carregarComPlataforma(mundo, j, t, dt)` e aplicado tanto no estado `'carregando'` (`js/cacada-core.js:658`) quanto no fluxo normal (`js/cacada-core.js:783`).
- **Teste que prova**: `test/caca-bugs-agente2.test.js` — `cacada-core: Buzz! carrega e dispara em cima de plataforma móvel M` e `cacada-core: dash em cima de plataforma móvel M mantém noChao e dashDisponivel`.

### 1.2 `js/cacada.js:3402,3406,3733` — `teclasApertadas` não era limpo em `soltarTudo()` e faltava handler de `blur`
- **Bug**: `soltarTudo()` zerava `entrada[k] = false` e `foco.apertado = false`, mas não chamava `teclasApertadas.clear()`. Além disso, não havia listener em `window` para `blur` (apenas `document` `visibilitychange`).
- **Como reproduzir / por que é bug**: Segurar `ShiftLeft` (dash), perder foco da janela (ex.: Alt+Tab sem esconder a aba) ou pausar/abrir o mapa, soltar `ShiftLeft` fora e depois pressionar e soltar `KeyC`: na linha `3547` (`!esquema.dash.some((k) => k !== c && teclasApertadas.has(k))`), `teclasApertadas` ainda contém `'ShiftLeft'`, deixando `entrada.dash = true` travado.
- **Correção feita**: `teclasApertadas` declarado antes de `soltarTudo()`, chamada `teclasApertadas.clear()` adicionada dentro de `soltarTudo()`, e registrado `window.addEventListener('blur', soltarTudo)`.
- **Teste que prova**: `test/caca-bugs-agente2.test.js` — `cacada: perder foco (blur) limpa teclasApertadas e evita dash preso ao soltar outra tecla`.

### 1.3 `js/cacada.js:3503,3605` — Navegação na loja com 0 itens gerava `visual.lojaSel = NaN`
- **Bug**: Nos handlers de `keydown` (`js/cacada.js:3501-3508`) e toque (`js/cacada.js:3603-3608`) quando `jogo.fase === 'loja'`, calcular `(visual.lojaSel + n - 1) % n` ou `(visual.lojaSel + 1) % n` com `n === 0` resulta em `% 0` -> `NaN` (enquanto o analógico em `:3653` já usava `|| 1`). No teclado, apertar para baixo com `n === 0` também incrementava `visual.lojaSel++` indefinidamente.
- **Como reproduzir / por que é bug**: Entrar em estado `jogo.fase === 'loja'` com `itensLoja()` vazio e pressionar cima/baixo no teclado ou no toque.
- **Correção feita**: Guardas `if (!n) { if (nome === 'baixo') acao('sairLoja'); return; }` após `Escape`/`Tab` no teclado, e `if (!n) return;` no `pointerdown` dos botões de toque.
- **Teste que prova**: `test/caca-bugs-agente2.test.js` — `cacada: navegação na loja com 0 itens não gera lojaSel = NaN`.

### 1.4 `js/cacada.js:3179-3180` — Resumo do save na tela inicial fixava `/4 habilidades`
- **Bug**: A tela inicial exibia `${habs}/4 habilidades`, valor legado anterior à expansão que elevou `HABILIDADES` para 7 itens (`rajada`, `dash`, `parede`, `pulo2`, `bigorna`, `pipa`, `buzz`).
- **Como reproduzir / por que é bug**: Ter um save com 5, 6 ou 7 habilidades e abrir a tela inicial: o texto mostrava ex. `7/4 habilidades`.
- **Correção feita**: Substituído o literal `4` por `Object.keys(HABILIDADES).length` (`totalHabs`).
- **Teste que prova**: `test/caca-bugs-agente2.test.js` — `cacada: resumo do save na tela inicial mostra total real de habilidades`.

### 1.5 `assets/italos-surfer/main.mjs:102` — `pointerup` e `pointercancel` sem checagem de `pointerId` nem de `mode === 'playing'`
- **Bug**: `pointerup` e `pointercancel` no canvas não verificavam `gesture.id === e.pointerId` antes de avaliar duplo toque (`action('board')`) e zerar `gesture = null`, e `pointerup` também não verificava `mode === 'playing'`.
- **Como reproduzir / por que é bug**:
  1. Em multi-toque, iniciar um gesto com dedo 1 e soltar/cancelar um segundo dedo (`pointerId` diferente): `gesture` ativo do dedo 1 era apagado e podia disparar `lastTap` / `action('board')` indevidamente.
  2. Pausar o jogo (`blur` ou `visibilitychange`) com um toque em andamento e depois soltar o dedo disparava `action('board')` fora de `'playing'`.
- **Correção feita**:
  - `pointerup` agora retorna imediatamente se `!gesture || gesture.id !== e.pointerId`, e se `mode !== 'playing'` apenas limpa `gesture = null` e retorna.
  - `pointercancel` só limpa `gesture = null` quando `gesture && gesture.id === e.pointerId`.
- **Teste que prova**: `test/caca-bugs-agente2.test.js` — `italos-surfer: pointerup/pointercancel ignoram outro pointerId e pointerup fora de playing não dispara board`.

---

## 2. Bugs fora do escopo e suspeitas (só anotado)

### 2.1 `css/style.css:1804-1883` (fora do escopo — só anotado) — Overflow horizontal nos controles v2 da Caçada em celular 375 px
- **Bug / Suspeita**: Em retrato com largura de `375 px` (`@media (max-width: 560px)`), `.game-dialog` aplica `padding: 16px` (sobram `343 px` úteis), mas `.cacada-controles--v2` soma `.cacada-analogico` (`width: 160px; flex: none`), `gap: 8px`, `padding: 0 4px` (`8 px`) e `.cacada-acoes` (3 colunas com `.cacada-botao--menor { min-width: 52px }` + `gap: 6px * 2` = `168 px` mínimo sem contar bordas e textos), totalizando `>= 344 px` e podendo estourar a largura de `375 px`.
- **Ação**: Só anotado (`css/style.css` está fora da lista editável do Agente 2).
- **Prova**: Inspeção direta das regras em `css/style.css:1718,1773-1775,1806,1841-1847,1877-1879`.

### 2.2 `assets/italos-surfer/style.css:2,16` (suspeita — só anotado) — Regra conflitante de `.map-stamp` no mobile
- **Suspeita**: Na linha `2`, `@media(max-width:650px)` define `.map-stamp{display:none}`. Na linha `16`, outro bloco `@media(max-width:650px)` reposiciona `.map-stamp{right:3vw;bottom:98px;max-width:46vw;padding:9px;transform:rotate(3deg)}` sem alterar `display`, tornando o bloco da linha `16` CSS morto. Não foi alterado por poder ser escolha visual (ocultar o carimbo em telas estreitas para não cobrir o menu).
- **Ação**: Só anotado.

### 2.3 `js/game-dialog.js:48` (suspeita defensiva — só anotado)
- **Suspeita**: `window.EnzoConta?.pronto.then(atualizarRanking)` assume que, se `window.EnzoConta` existir, `pronto` é sempre uma Promise (`pronto?.then` seria mais defensivo, embora `js/auth-widget.js` sempre exponha `pronto`).
- **Ação**: Só anotado.

---

## 3. Verificação de assets e testes executados

- **Assets verificados em disco**:
  - `assets/flappy/game/sprites.json`: 6/6 sprites encontrados (`enzo.png`, `macarronada.png`, `faca-ponta.png`, `faca-cabo.png`, `garfo-ponta.png`, `garfo-cabo.png`).
  - `js/cacada.js` (`ARQUIVOS`): 56/56 caminhos verificados, `missing=0`.
  - `js/cacada-artes.js` (`CACADA_ARTES`): 406/406 caminhos verificados, `missing=0`.
  - `italos-surfer.html` e `assets/italos-surfer/style.css`: `css/icones.css`, `italos-botao-start.png`, `italos-carimbo.png`, `italos-pause.png`, `italos-gameover.png` todos presentes em disco.

- **Testes rodados após a última edição de código**:
  Comando:
  `node --test test/cacada*.test.js test/flappy-core.test.js test/italos-surfer*.test.mjs test/caca-bugs-agente2.test.js`
  Resultado exato:
  - `tests 119`
  - `pass 115`
  - `fail 0`
  - `cancelled 0`
  - `skipped 4` (os 4 testes opcionais `CACADA_BLOQUEIOS=1` em `test/cacada-robo.test.js`)
  - `duration_ms 21564.5209`
