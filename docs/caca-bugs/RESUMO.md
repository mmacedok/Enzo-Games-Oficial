# Resumo da Caça-Bugs — Enzo Games

- **Worktree / branch**: `D:\AI Workshop\Jogos\Enzo Games\caca-bugs` (`caca-bugs`, `693069a`)
- **Relatórios por área**:
  - [linha-de-base.md](linha-de-base.md)
  - [agente-1.md](agente-1.md) — Batalha / TCG no navegador
  - [agente-2.md](agente-2.md) — Jogos (Caçada, Flappy, Italo's Surfer)
  - [agente-3.md](agente-3.md) — Backend e contas
  - [agente-4.md](agente-4.md) — Leitor, home, admin, páginas e CSS

---

## 1. Comparação de testes (antes × depois)

| Execução | Total (`tests`) | Passaram (`pass`) | Falharam (`fail`) | Pulados (`skipped`) | Duração |
|---|---:|---:|---:|---:|---:|
| **Antes** (`npm test`, linha de base) | 393 | 375 | 14 | 4 | 59.31 s |
| **Depois** (`npm test`, pós-correções) | 415 | 397 | 14 | 4 | 60.53 s |
| **Diferença** | +22 | +22 | 0 | 0 | — |

- Todos os **22 testes novos** criados em `test/caca-bugs-agente1.test.js` (5), `test/caca-bugs-agente2.test.js` (6), `test/caca-bugs-agente3.test.js` (5) e `test/caca-bugs-agente4.test.js` (6) passaram.
- As **14 falhas finais são exatamente as mesmas da linha de base** (nenhuma regressão):
  - `3` em `test/cabo-coco-mask.test.js` (ausência de `assets/Personagens/cabo-coco.png` gerado por `npm run build`);
  - `7` em `test/catalog.test.js`, `1` em `test/comentarios.test.js`, `1` em `test/conquistas.test.js:72` e `1` em `test/musicas.test.js` (ausência de `data/database.json` gerado por `npm run build`);
  - `1` em `test/pipeline.test.js:35` (`capas: 5236360` pré-existente na linha de base).
- Os **4 pulados** são os testes opcionais de `CACADA_BLOQUEIOS=1` em `test/cacada-robo.test.js`.

---

## 2. Bugs corrigidos (28 itens)

### Agente 1 — Batalha / TCG (`docs/caca-bugs/agente-1.md`)
1. `js/tcg-robo.js:31` (`batalha.html:49`) — `danoPrevisto` agora reconhece `danoDiretoJogador` (`Cobrança Final`) como alvo no jogador mesmo sem `jogada.alvo === R.JOGADOR`.
2. `js/batalha.js:2756-2761, 3504-3508` (`batalha.html:50`) — Guarda para `ev.estado` ausente em evento `imune` (evita `TypeError` em `registrarEvento` e `Já foi undefined!` em `tocar`).
3. `js/batalha.js:1617-1618, 1687, 1696, 2016` — Ataques `danoDiretoJogador` não calculam dano contra ativo, não exibem botão `"No ativo"` e não aceitam soltura no ativo em `soltarAtaque`.
4. `js/batalha.js:2742, 2768-2769, 3603-3604` — Adicionado `case 'descarte':` (`Hoje é quarta-feira`) no histórico/animação e formatado `num(ev.metade)` em `areaAplicada`.
5. `js/batalha.js:2498-2499, 2576` — Remoção do listener `aoMudarColuna` de `window.matchMedia` em `online.chatParar` (evita vazamento por partida online).
6. `css/batalha.css:1335-1347` + `batalha.html:26,49,50` — Corrigida sobreposição da barra superior sobre `.bt-lado--npc .bt-info` em `375px` (verificado em Chromium headless na porta `3411`) e atualizado `?v=rev1113a`.

### Agente 2 — Jogos: Caçada, Flappy, Italo's Surfer (`docs/caca-bugs/agente-2.md`)
7. `js/cacada-core.js:853, 658, 783, 845` — `apoiado()` agora considera plataformas móveis (`M`) e o estado `'carregando'` (Buzz!) acompanha a plataforma via `carregarComPlataforma()`.
8. `js/cacada.js:3402, 3406, 3733` — `soltarTudo()` limpa `teclasApertadas` e registra `window.addEventListener('blur', soltarTudo)`, evitando `entrada.dash` preso ao perder foco.
9. `js/cacada.js:3503, 3605` — Guardas para lista vazia (`n === 0`) na navegação da loja por teclado e toque (evita `visual.lojaSel = NaN`).
10. `js/cacada.js:3179-3180` — Resumo do save na tela inicial usa `Object.keys(HABILIDADES).length` (7) em vez do literal `/4 habilidades`.
11. `assets/italos-surfer/main.mjs:102` — `pointerup` e `pointercancel` verificam `gesture.id === e.pointerId`, e `pointerup` não dispara `board` fora de `mode === 'playing'`.

### Agente 3 — Backend e contas (`docs/caca-bugs/agente-3.md`)
12. `api/leituras.js:40` — Corrigido escape de curingas (`\`, `%`, `_`) em `GET /api/admin/leituras?q=`.
13. `api/admin.js:186-205` — Protegido `JSON.parse(deckLinha.cartas)` com `try/catch` e `Array.isArray` em `GET /api/admin/users/:id` (evita HTTP 500 se corrompido).
14. `api/upload.js:142-182, 233` — Validação de `typeof item.gibi === 'string'`, bloqueio de path traversal (`"."`, `".."`) e slug vazio em `prepararItem`, e normalização numérica (`"1"`/`"01"`) na checagem de capítulo duplicado no lote.
15. `api/tcg.js:753-754, 514-530` — Validação de `bigint` seguro em `?desde` de comentários (evita HTTP 500) e `try/catch` ao copiar deck público corrompido (HTTP 409).
16. `api/auth.js:137-141` e `js/auth-widget.js:73-77, 130-131` — Preservado `cargo` (`moderador`) na restauração de sessão e devolvido/atualizado `admin` e `cargo` no login fresco via Google.
17. `js/auth-widget.js:798-801` — `carregarCatalogo()` retorna `Promise.reject` quando `window.carregarCatalogo` não existe, evitando `TypeError` síncrono.
18. `js/auth-widget.js:145-157, 483, 666-672` — `.catch()` e reset de `numeroProprio`/`batalhaProprio` em `sairDaConta`, `C?.LISTA.length` em `listaDeLeitores`, e `.catch()` + controle de corrida (`rankingPedido`) em `mostrarRanking`.
19. `js/comentarios.js:55, 256-276` — `catch` em `comConfirmacao`, controle de corrida (`pedidoId`) e reset de `ultimo` em `carregar()`.

### Agente 4 — Leitor, home, admin, páginas e CSS (`docs/caca-bugs/agente-4.md`)
20. `js/reader.core.js:583-590` — Delegado `keydown` do painel de capítulos para `recordatorio` (antes buscava `.capitulos-painel` antes de ser criado).
21. `js/reader.core.js:694-700` — Só reaproveita `currentChapterId` do `localStorage` quando `comic.id === localStorage.getItem('currentComicId')`, e normaliza `chapterIndex`.
22. `js/reader.core.js:402-411` — Fallback em `load` (`naturalWidth > naturalHeight`) para exibir o botão Ampliar em páginas horizontais ausentes de `SiteImages`.
23. `js/comic-open.js:110-111` — Resolve `--cover` relativo contra `document.baseURI` para evitar 404 em `css/assets/...`.
24. `js/midia.js:140-147` — `barra.input` checa `ehAtual(faixa)` antes de aplicar `audio.duration` para evitar seek com duração da faixa anterior.
25. `js/midia.js:331-337` — `desenharFeixe()` retorna se o cinema/tela estiver oculto (`0×0`) ou sem `.projetor-lente`.
26. `js/os-equipe.js:142-144` e `js/os-gibis.js:12-17, 54-56, 70-72` — Guardas para `cover` ausente evitando requisição `/undefined`.
27. `js/characters.js:173-188` — `try/finally` limpando `voando` em `abrir()`/`fechar()` e guarda `if (clone)` em `fechar()`.
28. `css/style.css:1804-1890` — Corrigido overflow horizontal de `.cacada-controles--v2` em celular `375px` retrato (reportado pelo Agente 2).

---

## 3. Suspeitas não corrigidas ("só anotado")

### Batalha / TCG (`docs/caca-bugs/agente-1.md`)
- `js/tcg-regras.js:1280-1284, 1446-1448`: `notificado` da Mansão do Inominável e do poder d'O Inominável não verifica `imuneEstados` (Super Italo); não alterado por envolver regra de combate / `REGRAS_VERSAO` / `docs/BATALHA-CHANGELOG.md`.
- `js/tcg-regras.js:1463-1467` e `js/batalha.js:1599`: `roubarAuraVape` (Pidão do Vape) busca `naMesa(ele)` em vez de só o ativo e UI não expõe seletor de aliado no banco.
- `js/tcg-regras.js:840-857`: `emprestimosAura` reduz a Aura do atacante ao vencer o prazo mesmo se `donoOrig` já saiu da mesa.
- `js/batalha.js:3424, 3430`: limiares visuais `50`/`90` anteriores à `ESCALA = 20`.
- `js/admin-deck.js:311`: `setTimeout(carregar, 2500)` não checa `parado` antes de re-chamar após erro (embora `carregar()` cheque `raiz.isConnected`).

### Jogos (`docs/caca-bugs/agente-2.md`)
- `assets/italos-surfer/style.css:2, 16`: dois blocos `@media(max-width:650px)` sobre `.map-stamp` onde o primeiro define `display:none` e o segundo reposiciona sem alterar `display`.
- `js/game-dialog.js:48`: `window.EnzoConta?.pronto.then(...)` sem `?.` antes de `.then`.

### Backend e contas (`docs/caca-bugs/agente-3.md`)
- `api/baralho.js:286-312`: corrida teórica ao resgatar simultaneamente dois *códigos distintos* de visitante na mesma conta.
- `api/tcg.js:391-417`: `criarRevanche` executa `UPDATE` antes do `INSERT` sem transação (limitação do driver HTTP Neon).
- `api/tcg.js:436, 621, 719` e `api/leituras.js:65`: retorno de `display_name` completo em vez de `nomePublico(display_name)`.
- `api/tcg.js:425-433` vs `594`: coluna `visto_em` gravada na criação da sala mas não atualizada/filtrada em `GET /api/tcg/salas`.
- `server.js:93, 109-111`: erro de corpo grande no `express.raw` ou `Host` inválido cai no handler padrão do Express (HTML em vez de JSON).

### Leitor, home, admin e páginas (`docs/caca-bugs/agente-4.md`)
- `js/main.js:359-376`: `esperandoLogin = 'ronda'` permanece armado se o usuário fechar o convite `.conta-convite` (em `js/auth-widget.js`) e logar depois pelo cabeçalho.
- `js/os-gibis.js:94-95`: `URL.createObjectURL(file)` em `urlDe()` não chama `revokeObjectURL` ao trocar de capítulo/sair.

---

## 4. O que ficou sem fazer

- **`npm run build` (`data/database.json` e `assets/Personagens/cabo-coco.png`)**: não executado para não gerar artefatos fora do escopo; por isso os `13` testes que dependem desses arquivos gerados continuam falhando exatamente como na linha de base.
- **`test/pipeline.test.js:35` (`capas: 5236360`)**: falha de orçamento de tamanho de capas já existente na linha de base (não editado para não apagar/alterar assets).
- **Testes opcionais de Caçada (`CACADA_BLOQUEIOS=1`)**: `4` testes pulados por padrão em `test/cacada-robo.test.js` (mesmo comportamento da linha de base).
- **Suspeitas que exigiam decisão de regra/design ou revisão cruzada entre áreas** (listadas na seção 3).
