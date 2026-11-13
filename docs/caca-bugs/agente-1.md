# Relatório Caça-Bugs — Agente 1 (Batalha / TCG no navegador)

Escopo auditado: `js/batalha.js`, `js/tcg-cartas.js`, `js/tcg-regras.js`, `js/tcg-robo.js`, `js/baralho.js`, `js/baralho-dados.js`, `js/admin-deck.js`, `batalha.html` e `css/batalha.css`.

Verificações transversais realizadas:
- **Assets**: todas as referências `assets/...` encontradas em `batalha.html`, `css/batalha.css`, `js/batalha.js`, `js/baralho.js`, `js/baralho-dados.js` e `js/admin-deck.js` existem em disco.
- **XSS / DOM sinks**: busca nos arquivos editáveis do escopo encontrou apenas um uso estático de `innerHTML` (marcador SVG em `js/batalha.js:937`); demais renderizações usam `textContent` / `createTextNode`.
- **Cache-busting**: conferido em todos os `*.html` do repositório que apenas `batalha.html` carrega `css/batalha.css`, `js/tcg-robo.js` e `js/batalha.js`.

---

## Bugs corrigidos

### 1. `js/tcg-robo.js:31` — Robô avaliava `danoDiretoJogador` (`Cobrança Final`) como ataque no ativo do oponente
- **Bug**: Em `danoPrevisto(estado, j, jogada)`, `noJogador` só era `true` quando `jogada.alvo === R.JOGADOR`. Quando `jogadasValidas` incluía `{ tipo: 'atacar', ataque: 1 }` (sem `alvo: JOGADOR`) para ataques com efeito `danoDiretoJogador` (ex.: `Cobrança Final` do Tiago Cássio), o robô calculava dano/nocaute/letal contra `ele.ativo` (inclusive considerando escudo ou proteção do ativo) em vez de `R.JOGADOR`.
- **Como reproduzir / por que é bug**: Colocar `tiago-cassio` com 6 Auras contra um ativo com escudo (ex.: `enzo-games` com escudo `100 * ESCALA`) e o oponente com `6000` de vida; `EnzoTcgRobo.escolherJogada` avaliava o ataque sem alvo `JOGADOR` pelo alvo errado e deixava de reconhecer o dano direto letal no jogador.
- **Correção feita**: Atualizado `js/tcg-robo.js:31` para `const noJogador = jogada.alvo === R.JOGADOR || (ataque.efeitos || []).some((e) => e.tipo === 'danoDiretoJogador');`. Também atualizado `batalha.html:49` (`js/tcg-robo.js?v=rev1113a`).
- **Teste que prova**: `test/caca-bugs-agente1.test.js` — teste `R1`.

### 2. `js/batalha.js:2756-2761` e `js/batalha.js:3504-3508` — `TypeError` em `registrarEvento` e texto quebrado em `tocar` no evento `imune` sem `ev.estado`
- **Bug**: `js/tcg-regras.js:736` (proteção da Mariana ao Superkid contra dano que não é `'ataque'`, como Notificado ou Veneno) e `js/tcg-regras.js:985` (`smiteSemNocaute` no Superkid protegido) emitem `{ tipo: 'imune', uid, fonte }` / `{ tipo: 'imune', uid }` sem o campo `ev.estado`. Em `registrarEvento`, `ESTADOS[ev.estado].nome` lançava `TypeError: Cannot read properties of undefined (reading 'nome')`, interrompendo `passo()` e travando a partida; em `tocar`, `ESTADOS[ev.estado]?.nome` resultava em `Já foi undefined!`.
- **Como reproduzir / por que é bug**: Colocar `superkid` com status `notificado` e `mariana` no banco, passar o turno e deixar o `iniciarTurno` aplicar o dano de Notificado no Superkid: `registrarEvento` lançava `TypeError` na tela.
- **Correção feita**: Em `js/batalha.js:2756-2761` e `js/batalha.js:3504-3508`, guardado `ev.estado && ESTADOS[ev.estado]?.nome`, com fallback descritivo no histórico (`Notificado` / `veneno` / `esse efeito`) e balão `'IMUNE!'`. Também atualizado `batalha.html:50` (`js/batalha.js?v=rev1113a`).
- **Teste que prova**: `test/caca-bugs-agente1.test.js` — teste `R2`.

### 3. `js/batalha.js:1617-1618`, `js/batalha.js:1687,1696` e `js/batalha.js:2016` — UI exibia botão `"No ativo"` e aceitava soltar no ativo para ataques `danoDiretoJogador` (`Cobrança Final`)
- **Bug**: Em `acoesDaCarta`, `abrirPainel` e `soltarAtaque`, ataques com `{ tipo: 'danoDiretoJogador' }` (como `Cobrança Final` do Tiago Cássio) eram tratados como golpes capazes de atingir `rival.ativo`: calculavam `previsto` contra `ele.ativo`, exibiam o botão `"No ativo"` no painel e permitiam soltar a carta sobre o ativo do rival em `soltarAtaque`. Pela regra da carta (`js/tcg-cartas.js:164`, `js/baralho-dados.js:208`) e implementação em `js/tcg-regras.js:1264`, esse efeito causa dano direto na vida do jogador adversário.
- **Como reproduzir / por que é bug**: Abrir o painel de `tiago-cassio` com 6 Auras no ativo enquanto o rival tem um ativo na mesa: aparecia o botão `"No ativo"` além de `"No jogador (6.000)"`.
- **Correção feita**: Detectado `const diretoJogador = (a.efeitos || []).some((e) => e.tipo === 'danoDiretoJogador');` em `acoesDaCarta` (`js/batalha.js:1617-1618`) para zerar `previsto` contra ativo, em `abrirPainel` (`js/batalha.js:1687,1696`) para não montar `jogAtivo` nem o botão `"No ativo"`, e em `soltarAtaque` (`js/batalha.js:2016`) para recusar soltura no ativo adversário.
- **Teste que prova**: `test/caca-bugs-agente1.test.js` — teste `R3`.

### 4. `js/batalha.js:2742`, `js/batalha.js:2768-2769` e `js/batalha.js:3603-3604` — Evento `descarte` ignorado no log/animação e `areaAplicada` sem formatação `num(...)`
- **Bug**:
  1. `Hoje é quarta-feira` (`js/tcg-regras.js:1030`) emite `{ tipo: 'descarte', ... }`, mas `registrarEvento` e `tocar` em `js/batalha.js` tratavam apenas `case 'descartar':`, omitindo o descarte do histórico e da animação imediata.
  2. `case 'areaAplicada':` (`js/batalha.js:2742`) exibia `${ev.metade}` sem `num(...)`, mostrando o valor bruto sem separador de milhar (ex.: `1000` em vez de `1.000`), divergindo de todos os demais danos do histórico.
- **Como reproduzir / por que é bug**: Jogar `hoje-e-quarta-feira` com cartas na mão: o evento `'descarte'` passava pelo `switch` sem caso correspondente. Atacar em área (`pmldm` / `itallo-de-viego`): o log registrava `ev.metade` sem `num(...)`.
- **Correção feita**: Adicionado `case 'descarte':` junto a `case 'descartar':` em `registrarEvento` (`js/batalha.js:2768-2769`) e em `tocar` (`js/batalha.js:3603-3604`); formatado `${num(ev.metade)}` em `js/batalha.js:2742`.
- **Teste que prova**: `test/caca-bugs-agente1.test.js` — teste `R4` (parte 1).

### 5. `js/batalha.js:2498-2499` e `js/batalha.js:2576` — Vazamento de listener em `window.matchMedia` ao sair do chat online
- **Bug**: `montarChat()` registrava `colunaFixa.addEventListener('change', () => { painel.hidden = !colunaFixa.matches; })` com função anônima e `online.chatParar` não removia o listener. Cada partida ou espectação online deixava o listener e a closure de `painel`/`lista` presos no `MediaQueryList`.
- **Como reproduzir / por que é bug**: Abrir e fechar partidas/espectações online repetidamente e disparar evento `'change'` no `MediaQueryList`: os listeners antigos permaneciam registrados.
- **Correção feita**: Nomeado `const aoMudarColuna = () => { painel.hidden = !colunaFixa.matches; };` (`js/batalha.js:2498-2499`) e adicionado `colunaFixa.removeEventListener('change', aoMudarColuna);` em `online.chatParar` (`js/batalha.js:2576`).
- **Teste que prova**: `test/caca-bugs-agente1.test.js` — teste `R4` (parte 2).

### 6. `css/batalha.css:1335-1347` e `batalha.html:26,49,50` — Sobreposição da barra superior no mobile (`375px`) e cache-busting
- **Bug**: Em viewport `375x667`, `.bt-voltar`, `.bt-rodada` e `.bt-menu-jogo` (posicionados com `position: fixed/absolute` no topo da tela) sobrepunham `.bt-lado--npc .bt-info` (`.bt-mesa` não tinha `padding-top` compensatório e `.bt-rodada` centralizado colidia com os botões laterais), além de `.bt-online-corpo--arte` usar borda de `44px` muito larga para telas `<= 480px`.
- **Como reproduzir / por que é bug**: Abrir `batalha.html` em `375x667` e iniciar uma partida contra o NPC: `getBoundingClientRect()` antes da correção mostrava interseção vertical entre `.bt-voltar` / `.bt-menu-jogo` e `.bt-lado--npc .bt-info` (`npcInfo` começando em `y: 16`, sobrepondo `voltar` e `menu`).
- **Correção feita**: Adicionadas regras responsivas em `css/batalha.css:1335-1347` (`@media (max-width: 639px), (max-aspect-ratio: 1249 / 1000)` com `.bt-mesa { padding-top: 46px; }`, `@media (max-width: 520px)` ajustando `.bt-rodada`, `@media (max-width: 480px)` reduzindo `.bt-online-corpo--arte` para `24px`, `@media (max-width: 380px)` com `.bt-mesa { padding-top: 44px; }`) e atualizado `batalha.html:26` (`css/batalha.css?v=rev1113a`), `batalha.html:49` (`js/tcg-robo.js?v=rev1113a`) e `batalha.html:50` (`js/batalha.js?v=rev1113a`).
- **Teste que prova**: Inspeção em Chromium headless `375x667` contra servidor local na porta `3411` (sem erros de console, `scrollWidth === 375`, zero sobreposição entre `.bt-voltar`, `.bt-menu-jogo`, `.bt-rodada` e `.bt-lado--npc .bt-info`) + `test/caca-bugs-agente1.test.js` — teste `R5`.

---

## Suspeitas e discrepâncias anotadas ("só anotado")

Itens em que não foi feita alteração de regra de jogo/balanço (exigiriam revisão de `REGRAS_VERSAO` / `docs/BATALHA-CHANGELOG.md` ou definição de design):

1. **`js/tcg-regras.js:1280-1284` e `js/tcg-regras.js:1446-1448` (`notificado` ignora `imuneEstados`)**:
   - **Suspeita**: A Mansão do Inominável (`executarAtaque`, linhas `1280-1284`) e o poder `notificarAtivo` d'O Inominável (linhas `1446-1448`) atribuem `ele.ativo.estados.notificado = true` diretamente sem verificar `!ficha(estado, ele.ativo).imuneEstados` (ao contrário de `EFEITOS.estado` em `js/tcg-regras.js:925` e `venenoTeemoBanco` em `js/tcg-regras.js:1252`). Com isso, Super Italo (`pmldm` após `Despertar Ezreal`), cuja descrição em `js/baralho-dados.js:213` diz *"imune a ataques no banco e condições especiais"*, ainda recebe `Notificado`.
   - **Ação**: Só anotado (alterar regra de combate exige subida de `REGRAS_VERSAO` e atualização de `docs/BATALHA-CHANGELOG.md`, fora dos arquivos editáveis deste agente).

2. **`js/tcg-regras.js:1463-1467` e `js/batalha.js:1599` (`roubarAuraVape` — Pidão do Vape)**:
   - **Suspeita**: A descrição em `js/baralho-dados.js:218` diz *"rouba 1 Aura do ativo do adversário para ele ou para alguém do seu banco"*, mas:
     - `js/tcg-regras.js:1463` faz `naMesa(ele).find((c) => c.aura > 0)`, podendo roubar do banco adversário se o ativo tiver 0 Aura;
     - `js/batalha.js:1599` envia `{ tipo: 'poder', uid }` sem seletor de alvo aliado no banco (embora `js/tcg-regras.js:1464` aceite `jogada.alvo`).
   - **Ação**: Só anotado (divergência entre texto de carta, regra e UI de seleção de alvo).

3. **`js/tcg-regras.js:840-857` (`emprestimosAura` — Tiago Cássio)**:
   - **Suspeita**: Quando vence `emp.devolverNoTurno`, `inst.aura -= devolve` reduz a Aura da carta que roubou mesmo quando `donoOrig` não está mais na mesa (`!donoOrig`, linha `850`), fazendo a Aura simplesmente sumir. Pode ser intencional ("devolve/perde a aura temporária") ou caso de borda não especificado na doc.
   - **Ação**: Só anotado.

4. **`js/batalha.js:3424,3430` (limiar visual de dano `50` / `90` em `tocar`)**:
   - **Suspeita**: Os limiares `ev.valor >= 50` e `ev.valor >= 90` são anteriores à `ESCALA = 20` (o comentário na linha `3421` ainda cita "golpes de 50+"). Na escala atual (`ESCALA = 20`, danos típicos de 200 a 1.000+), praticamente todo golpe dispara `fx-pow`/`fx-bam` e tremor de tela (`tremer(mesa.raiz, 10)`).
   - **Ação**: Só anotado (efeito visual apenas).

5. **`js/admin-deck.js:311` (`setTimeout(carregar, 2500)` após `parar()`)**:
   - **Suspeita**: Se `carregar()` falhar e o painel for desmontado (`parar()`) antes de 2,5s, o `setTimeout(carregar, 2500)` ainda agenda uma última chamada (`carregar()` testa `if (!raiz.isConnected) return`, mas não testa `if (parado) return`). Impacto mínimo.
   - **Ação**: Só anotado.
