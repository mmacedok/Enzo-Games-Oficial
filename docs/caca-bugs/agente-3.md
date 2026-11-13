# Relatório do Agente 3 — Backend e contas

Escopo inspecionado: `api/*`, `server.js`, `cloudflare/*`, `netlify/*`, `js/auth-widget.js`, `js/api-cliente.js`, `js/conquistas.js`, `js/comentarios.js`.

---

## Bugs corrigidos

### 1. `api/leituras.js:40` — Escape quebrado de curingas (`%`, `_`, `\`) na busca `GET /api/admin/leituras?q=...`
- **Bug**: `busca.replace(/[\%_]/g, (c) => `\${c}`)` tinha dois erros: (1) dentro da classe `[\%_]`, `\%` escapava o `%` em vez de incluir `\` literal; (2) na template string `` `\${c}` ``, `\$` escapava o cifrão e produzia o texto literal `${c}` em vez de `\` + caractere.
- **Como reproduzir**: Um leitor chamado `ana_silva` e outro `anaxsilva` abrem um capítulo. Ao consultar `GET /api/admin/leituras?q=ana_silva`, a query recebia `%ana${c}silva%` e retornava 0 resultados; sem o bug e com escape correto, deve retornar apenas `ana_silva`.
- **Correção**: Alterado para `busca.replace(/[\\%_]/g, (c) => `\\${c}`)` (mesmo padrão de `api/admin.js:140` e `api/acessos.js:166`).
- **Teste**: `test/caca-bugs-agente3.test.js` ("leituras: busca com curingas (% e _) escapa corretamente sem retornar falsos positivos").

### 2. `api/admin.js:186-205` — `JSON.parse` sem proteção em `GET /api/admin/users/:id`
- **Bug**: `JSON.parse(deckLinha.cartas)` era chamado sem `try/catch` (ao contrário de `api/tcg.js:72` e de `api/admin.js:332,353,368`). Se `tcg_deck_custom.cartas` estivesse corrompido ou não fosse array, toda a ficha do usuário no terminal admin quebrava com erro 500.
- **Como reproduzir**: Inserir JSON inválido em `tcg_deck_custom.cartas` para um usuário e chamar `GET /api/admin/users/:id` como admin.
- **Correção**: Envolvido o `JSON.parse` em `try/catch` e validado `Array.isArray(parsed)`, assumindo `0` cartas se corrompido.
- **Teste**: `test/caca-bugs-agente3.test.js` ("admin: detalhe da conta não quebra (500) se tcg_deck_custom.cartas estiver corrompido").

### 3. `api/upload.js:142-182` e `233` — Path traversal por `titulo`/`gibi` (`"."`/`".."`), `TypeError` em `gibi` não-string e duplicado `"1"`/`"01"` no lote
- **Bug**:
  1. Em `validarItem` (`api/upload.js:142`), `item.gibi` não era checado como `string` (`!String(item.gibi || '').trim()`), permitindo número/objeto que quebrava com `TypeError: ...trim is not a function` (HTTP 500) em `prepararItem` (`(item.titulo || item.gibi).trim()`).
  2. Em `prepararItem` (`api/upload.js:175-181`), `titulo`/`gibi` igual a `".."` ou `"."` gerava `chave = ""` (poluindo `comics[""]` no manifesto) e `nomePasta = ".."` ou `"."`, resultando em `assets/Spin Offs/../Capitulo 1/...` (path traversal no `backendDisco` para fora de `Spin Offs/`). Valores como `"!!!"` também geravam `chave = ""`.
  3. Em `POST /api/admin/upload/publicar` (`api/upload.js:233`), a chave de detecção de duplicados no lote usava `item.capitulo` bruto, então `capitulo: 1` e `capitulo: "01"` passavam como distintos embora ambos resolvessem para `Capitulo 1`.
- **Correção**: Exigido `typeof item.gibi === 'string'` (até 120 chars) em `validarItem`; rejeitado `chave` vazia após `slug()` e `nomePasta` vazio ou composto só de pontos (`/^\.+$/`) com HTTP 400; normalizado `Number(item.capitulo)` na chave de duplicidade do lote.
- **Teste**: `test/caca-bugs-agente3.test.js` ("upload: bloqueia path traversal (\"..\" / \".\"), slug vazio, gibi não-string e capítulo duplicado \"1\"/\"01\"").

### 4. `api/tcg.js:753-754` e `514-530` — Overflow de `bigint` em `?desde` de comentários e `JSON.parse` sem `try/catch` ao copiar deck
- **Bug**:
  1. Em `GET /api/tcg/partidas/:id/comentarios` (`api/tcg.js:753`), `Number.parseInt(ctx.url.searchParams.get('desde'), 10) || 0` aceitava negativos e inteiros maiores que `bigint` (ex.: `9999999999999999999999` -> `1e+22`), fazendo o Postgres rejeitar o parâmetro `$2` (`n > $2`) com HTTP 500.
  2. Em `POST /api/tcg/decks-publicos/:id/copiar` (`api/tcg.js:515, 529`), `JSON.parse` era chamado sem `try/catch` (ao contrário de `GET /api/tcg/decks-publicos`), causando HTTP 500 se o JSON salvo estivesse inválido.
- **Correção**: Validado `Number.isSafeInteger(desdeBruto) && desdeBruto >= 0` (caso contrário `0`) em `comentarios`; envolvido `JSON.parse` em `try/catch` retornando HTTP 409 `'esse deck não está mais válido'` ao copiar deck corrompido.
- **Teste**: `test/caca-bugs-agente3.test.js` ("tcg: comentarios com ?desde fora do limite de bigint não retornam 500 e deck corrompido ao copiar retorna 409").

### 5. `api/auth.js:137-141` e `js/auth-widget.js:73-77, 130-131` — Cargo `moderador` perdido na restauração de sessão e `admin`/`moderador` ausentes após login fresco
- **Bug**:
  1. Em `js/auth-widget.js:75`, ao restaurar sessão via `restaurarSessao()` (`/api/auth/restaurar`), `eu` era montado apenas com `{ loggedIn: true, user: volta.user, admin: volta.admin }`, descartando `volta.cargo`. Assim, `estado.moderador` ficava `false` (ocultando o atalho `>_ terminal`). Além disso, a linha 77 não resetava `estado.moderador = false` quando deslogado.
  2. `POST /api/auth/google` (`api/auth.js:137`) não devolvia `admin` nem `cargo`, e `aoReceberCredencial` (`js/auth-widget.js:129`) não atualizava `estado.admin` nem `estado.moderador`, deixando ambos `false` até recarregar a página.
- **Correção**: Incluído `admin` e `cargo` na resposta de `POST /api/auth/google`, preservado `cargo: volta.cargo` em `carregarConta`, e atualizado `estado.admin`/`estado.moderador` em `aoReceberCredencial` e no reset de deslogado.
- **Teste**: `test/caca-bugs-agente3.test.js` ("auth: POST /api/auth/google devolve admin e cargo; auth-widget preserva moderador na restauração de sessão").

### 6. `js/auth-widget.js:798-801` — `carregarCatalogo()` lançava `TypeError` síncrono (rejeição não tratada) quando `window.carregarCatalogo` não existe
- **Bug**: `carregarCatalogo()` chamava `window.carregarCatalogo().catch(...)` diretamente sem checar se `window.carregarCatalogo` era função. Em páginas/ambientes sem `main.js`/`shelf.js`, a chamada na linha 857 (`carregarCatalogo().then(verificarColecoes).catch(() => {})`) disparava um `TypeError` síncrono antes da Promise, gerando erro não tratado (`unhandledRejection` dentro do `.then` da `pronto`).
- **Correção**: Retornar `Promise.reject(new Error('catálogo indisponível'))` quando `typeof window.carregarCatalogo !== 'function'`.
- **Teste**: Coberto e verificado em `test/caca-bugs-agente3.test.js` (teste 5 executa `js/auth-widget.js` completo até `EnzoConta.pronto` sem `window.carregarCatalogo` definido e sem `unhandledRejection`).

### 7. `js/auth-widget.js:145-157, 483, 666-672` — Logout offline, vazamento de `numeroProprio`/`batalhaProprio`, guarda opcional de `EnzoConquistas` e rejeição/corrida no ranking
- **Bugs**:
  1. `sairDaConta` (`js/auth-widget.js:145`): `await pedir('/api/auth/logout', ...)` sem `.catch(() => {})` impedia limpar o estado local se a rede falhasse; além disso, `numeroProprio` e `batalhaProprio` não eram zerados no logout, podendo exibir dados da conta anterior ao entrar com outra conta na mesma aba.
  2. `listaDeLeitores` (`js/auth-widget.js:483`): usava `C.LISTA.length` sem optional chaining, enquanto a linha 485 usava `C?.SECRETOS ?? 0`.
  3. `mostrarRanking` (`js/auth-widget.js:666`): `await pedir(...)` sem `.catch(...)` gerava promise rejeitada não tratada quando offline e não descartava respostas antigas ao trocar rapidamente de aba do ranking.
- **Correção**: Adicionado `.catch(() => {})` e reset de `numeroProprio = null; batalhaProprio = null;` em `sairDaConta`; usado `C?.LISTA.length ?? 0`; adicionado `.catch(...)` e contador `rankingPedido` em `mostrarRanking`.
- **Teste**: Análise estática + execução de `js/auth-widget.js` em `test/caca-bugs-agente3.test.js` (sem regressão).

### 8. `js/comentarios.js:55, 256-276` — Promise rejeitada não tratada em `comConfirmacao` e corrida em `carregar`
- **Bug**:
  1. Em `comConfirmacao` (`js/comentarios.js:55`), `await acao()` dentro do listener `click` não tinha `catch`, gerando rejeição não tratada quando apagar ou banir falhava na rede/API.
  2. `carregar()` (`js/comentarios.js:256`) podia ser disparado simultaneamente por `iniciar()` e `aoMudar()`, podendo intercalar respostas e duplicar comentários na lista; além disso, `ultimo` não era limpo ao recarregar do início (`!maisAntigas`).
- **Correção**: Adicionado `catch` em `comConfirmacao` (o `finally` já reabilita o botão e restaura o rótulo), contador `pedidoId` em `carregar()` para ignorar respostas obsoletas e reset `ultimo = null` quando `!maisAntigas`.
- **Teste**: Inspecionado em conjunto com `test/comentarios.test.js` (nota: `test/comentarios.test.js` falha na linha de base apenas por ausência de `data/database.json`).

---

## Suspeitas e itens só anotados (não alterados)

1. **`api/baralho.js:286-312` (`POST /api/baralho/visitante/resgatar`)**: Se dois pedidos simultâneos da mesma conta tentarem resgatar dois *códigos diferentes* de visitante ao mesmo tempo, o segundo pedido pode marcar a segunda linha de `pacotes_visitante` como `resgatado_por = $1` antes de `marcou` (`ON CONFLICT DO NOTHING` em `presentes`) cancelar o crédito das cartas. Risco baixo (exige corrida com dois códigos distintos).
2. **`api/tcg.js:391-417` (`criarRevanche`)**: O `UPDATE tcg_partidas SET revanche_id = $2` ocorre antes do `INSERT INTO tcg_partidas` (limitação conhecida do driver HTTP do Neon sem transações); se o `INSERT` falhasse, `revanche_id` apontaria para partida inexistente.
3. **`api/tcg.js:436, 621, 719` e `api/leituras.js:65`**: Algumas rotas retornam `display_name` completo (nome do Google) em vez de `nomePublico(display_name)` usado em `/api/readers`, `/api/comments` e `/api/tcg/decks-publicos`. Mantido como está para não alterar regra/contrato existente.
4. **`api/tcg.js:425-433` vs `594`**: A coluna `visto_em` é gravada na criação da sala (`POST /api/tcg/salas`) mas não é atualizada nem filtrada em `GET /api/tcg/salas`. Mantido como está (decisão de regra/design).
5. **`server.js:93, 109-111`**: Erros de limite de corpo do `express.raw` (413) ou `Host` inválido ao construir `new Request(...)` caem no handler padrão do Express (HTML em vez de JSON). Mantido por ser comportamento menor do servidor local.
