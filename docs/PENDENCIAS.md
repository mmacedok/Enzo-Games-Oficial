# O que falta fazer

> **Documento vivo.** O Claude atualiza no fim de cada tarefa: tira o que ficou pronto (vai para
> "Feito recentemente" com a data), acrescenta o que ficou pendente e reordena as prioridades.
> O Henrique pode marcar `[x]`, riscar, mudar a prioridade ou escrever um comentário em qualquer
> item (ex.: `> Henrique: deixa para depois`); o Claude segue isso na próxima atualização.
> Testes que faltam rodar ficam em [`TESTES-PENDENTES.md`](TESTES-PENDENTES.md) (não repetidos aqui).
>
> Última atualização: **2026-09-30**.

**Legenda:**
- **Quem:**
  - 🧑 Henrique (decisão ou arte);
  - 🤖 Claude;
  - 🐋 DeepSeek (via Claude);
  - ♊ Gemini.
- **Onde:** `main` = site no ar; `TCG` = Baralho/Batalha.

---

## 🔴 Agora (prioridade alta)

- [ ] **Multiplayer mais rápido no ar:** no painel da Cloudflare (Pages → Settings → Functions →
  Placement), testar "Smart" para a API rodar perto do banco Neon. Não deu para conferir a opção
  daqui. 🧑

- [ ] **Quarta, 2026-09-30: liberar a Batalha dos Torados ao público.** Hoje ela está no site
  escondida (só pela porta secreta do nº 99 dos Enzos secretos). No dia: voltar o item do convite e o
  atalho na aba Baralho (`js/baralho.js`), tirar o `noindex` de `batalha.html` e decidir se a porta
  do 99 fica. 🧑 avisar → 🤖

- [ ] **Saldo do DeepSeek no fim (US$ 0,17).** Dá para ~3 tarefas médias. Recarregar uns US$ 5 ou
  usar a reserva grátis da NVIDIA (`--provedor nvidia`, lenta). 🧑
- [ ] **8 sprites da Caçada com o desenho cortado** (falta pedaço do desenho, não dá para limpar).
  Decidido em 2026-09-26: **não re-fatiar por enquanto.**
  - **Dá para re-fatiar das folhas nomeadas** (`Codex\Cacada - Expansao de Sprites\entrada`,
    consertando o fatiamento em células iguais do `preparar-sprites.cjs`):
    - Coach `palestra-01` (pé);
    - Ratão `arremessar` e `atordoado-02`;
    - Moderador `golpe` (martelo);
    - rato `preparar` (focinho).
  - **Sem folha de origem, precisam ser redesenhados:**
    - troll `investida-02` (mãos);
    - `spam-03` (canto do envelope);
    - `chefes/punho.png` (topo do punho).
  - Para achar novos problemas: `node tools/sprites-bordas.js`. Para limpar linhas fantasma e pedaços
    soltos: `tools/sprites-limpar.js`. 🧑 decidir → 🤖/🐋

### Batalha dos Torados (`TCG`)
- [ ] **Relógio do Aura de 67 Segundos** aparece na frente do Superkid, não atrás como diz o doc
  (a camada de efeitos fica acima das cartas). 🤖
- [ ] **Efeitos ainda não vistos um a um** no jogo (KO, POW/BAM, meteoros da Macarronada, etc.).
  Rodar `node Bridge/tools/batalha-smoke.mjs` e olhar capturas. 🐋/♊
- [ ] **Link de jogar (artifact) desatualizado:**
  - o que está publicado: claude.ai/artifact/VUPMuaHWcGXx732Y22wE47;
  - o que falta: não tem os efeitos novos nem as correções.
  - Republicar com `tools/batalha-artifact.mjs`. 🤖
- [ ] Parênteses do Escudo: ficou o efeito do evento (700 ms). Se preferir o deslizando (420 ms), trocar. 🧑

### Caçada
- [ ] **Abrir a Caçada sozinha depois de um login Google de verdade** (o convite pede login e o jogo
  deveria abrir em seguida). Nunca testado com conta real, só com o login falso. 🧑 testar no site.

## 🟡 Decisões em aberto (🧑)

- [ ] **Brilho das capas no celular:** anima o tempo todo (custa um pouco). Manter ou deixar parado?
- [ ] **Arte crua por link direto:** quem abre o endereço da imagem vê o Cabo Côco sem tarja, e a
  senha está no código do site. Decidido em 2026-09-26: **fica assim** (é easter egg). Só mudar se
  quiser a versão com servidor.

## 🔵 Melhorias de código (sem pressa) 🤖/🐋

- [ ] `moverY` da Caçada ainda devolve `tx`/`ty` que ninguém lê (sobra da telha). Detalhe.
## 📦 Guardado (não é pendência, é para lembrar)
- **Degustação Noturna (Ronda):** em `arquivo/ronda/` desde 2026-09-26, com README de como voltar.

---

## ✅ Feito recentemente
- 2026-09-30: **Capítulo 8 escondido temporariamente** (`"hidden": true` em `capitulo-8` no `data/comics.manifest.json`; suporte novo em `atualizar.js`). Para publicar de novo, usar `reveal capitulo-8` no terminal admin; `hide capitulo-8` esconde novamente. O manifesto continua com `hidden: true`. Enquanto estiver escondido, o "Leitor da Saga" exige só os capítulos 1 a 7.
- 2026-09-30: **"Como jogar" da Batalha agora são as 2 cartilhas ilustradas** (`assets/Batalha/como-jogar-1.png` e `-2.png`): abrem sozinhas na primeira visita (marca `enzo-batalha-cartilha-vista` no navegador) e pelo botão Como jogar do menu e da mesa. O texto antigo das regras foi apagado do `js/batalha.js`. Quem mudar regra precisa refazer a cartilha.
- 2026-09-30: **Botão Voltar na mesa da Batalha:** canto superior esquerdo (no celular só a seta), com a mesma confirmação do 🏠 (o 🏠 do canto direito ficava atrás da conta).
- 2026-09-30: **"Ver cartas" na escolha de deck da Batalha:** cada deck ganhou o botão; abre as cartas do deck (com ×quantidade) e, ao tocar numa, mostra a carta grande com a frase e o que ela faz no TCG (`mostrarCartasDoDeck` em `js/batalha.js`).
- 2026-09-30: **Placar da Batalha na ficha de cada leitor:** quadro "Batalha dos Torados" (vitórias, derrotas, empates e posição, só partidas online) na Minha ficha e nas fichas públicas; `/api/readers/:id` ganhou `batalha`. (o Henrique liberou; `CLAUDE.md` atualizado).
- 2026-09-30: **Capítulo 6 refeito:** as 5 páginas novas (de `Enzo Games Shit/CAP6`) no lugar das antigas (apagadas, com os webp antigos) e a tarja de censura do capítulo 6 removida do `data/comics.manifest.json` (a do capítulo 5 continua).
- 2026-09-30: **Descrição das 24 cartas:** a frase de cada carta agora aparece entre parênteses e, abaixo (carta grande do Baralho e painel da Batalha), o que a carta faz no TCG (campo `tcg` em `js/baralho-dados.js`; vida, custo e dano ×20 como no jogo). Um teste (`test/tcg-regras.test.js`) confere o texto contra `js/tcg-cartas.js`: mudou balanceamento, atualize o texto.
- 2026-09-30: **Baralho, "Abrir de uma vez ⚡"** na abertura: o pacote brilha branco, explode num clarão
  e vai direto para a mesa final com todas as cartas (a pilha continua clicando no pacote).
- 2026-09-30: **Baralho, presentes** (`api/baralho.js`, `js/baralho.js`, `BOAS_VINDAS`/`DIARIO`/`PRESENTES_UNICOS` em `js/baralho-dados.js`):
  - visitante sem login ganha e abre 3 pacotes (1 de cada) na chegada; depois, "Quer salvar suas cartas? Faça login".
    No login as mesmas cartas vão para a conta (só conta que nunca abriu pacote; código vale 7 dias);
  - conta nova: 3 pacotes de boas-vindas (antes 1 Estacionamento);
  - pacote do dia (Toradolândia) com sequência 🔥; a cada 7 dias seguidos, Piscina de Macarronada;
  - presente único da grande atualização: 1 Piscina para toda conta (para encerrar, apagar a linha em `PRESENTES_UNICOS`).
  - Pendente: QA completo pelo Gemini (celular, Esc/foco, 2 abas); a rota de visitante não tem limite por IP
    (dá para abrir de novo em aba anônima até tirar lendária — risco aceito pelo Henrique).
- 2026-09-30: **Capítulo 8 ("A rotina impossível!") no site**: capa e 12 páginas (1080×1920) em
  `assets/Capitulo 8/`, PNGs recomprimidos sem perda (64 MB → 44 MB, pixels idênticos) e entrada no
  `data/comics.manifest.json`. Aparece como destaque da home e no leitor.
- 2026-09-30: **Batalha, cara ou coroa no começo:** a moeda do Glitch (cara = Enzo, coroa = touro)
  gira antes de "VOCÊ COMEÇA!". O jogador 0 é **Games** e o jogador 1 é **Torado** (contra o robô,
  você é sempre Games); cai o lado de quem começa. Só tela: o motor já sorteava (`estado.primeiro`).
- 2026-09-30: **Batalha, regra nova** (`docs/PLANO-VIDA-JOGADOR.md`):
  - **Vitória por vida:**
    - 6.000 de vida; HP e dano das cartas ×20;
    - o dono perde vida quando uma carta dele cai;
    - ataque no jogador (com o ativo dele na mesa, entra só 35%);
    - derrubou uma carta, golpe extra de graça no jogador;
    - derrubou de um golpe só, a carta vira (recarga).
  - **Recarga** em Macarronada a 300%, Vírgula-rangue, Bala Dourada e Ban de 7 Dias. A carta virada
    mostra o verso da Batalha.
  - **Devolver cartas ao baralho:** até 2 da mão e 1 da mesa por turno. A Casa do Enzo também devolve
    ao baralho antes de comprar.
  - **Online:**
    - lista de salas abertas (entrar com 1 clique);
    - placar permanente (vitórias, derrotas e empates);
    - partidas da regra antiga são encerradas sem resultado.
  - Correção do arrasto no iPhone.
  - 107 testes passando.
  - **Pendente:**
    - decisão do Henrique sobre o dano de nocaute ×1,5 (a calibragem recomendou);
    - QA completo pelo Gemini (computador, celular e online com 2 abas);
    - o robô fácil termina 29% das partidas no limite de turnos;
    - `main` só quando o Henrique pedir.
- 2026-09-28: **Layout da Batalha no celular e no computador:** a mesa encolhe as cartas até caber na
  tela (antes passava da tela e cortava a mão embaixo); efeitos, balões e números ficam dentro da parte
  visível; a dica e o efeito do campo recolhem numa linha depois de 3,5 s (tocar abre); HP das cartas
  proporcional à carta; celular deitado com barras compactas; letreiros quebram linha no celular.
- 2026-09-28: **Multiplayer do TCG consertado** (relato do Henrique):
  - aura e Passar apagados na própria vez: a mesa era desenhada com "ocupado" ligado depois da busca;
  - lentidão: busca a cada 1 s (antes 2,5 s), "teve jogada?" lê só a versão, jogada com uma ida a
    menos ao banco. No teste local, o pior atraso caiu de 30 s para 1,7 s;
  - toda carta vale 1 ponto (lendário também);
  - inatividade com medidor próprio (losangos ⏱) e derrota por "inatividade", sem virar ponto de carta.
- 2026-09-28: Baralho e Batalha no `main` (merge do `TCG`). O Baralho aparece normal; a Batalha
  fica escondida até quarta, com entrada só pelo nº 99 dos Enzos secretos. O Netlify redireciona para a Cloudflare.
- 2026-09-27: **37 ícones do Codex no lugar dos emojis** (tarefa 01 da ponte, 37/37 na conferência). 22 do site no `main` (convite de login, ranking, conquistas, senha, moderação) e 15 no `TCG` (Baralho e Batalha). Push dos dois feito (`main` 4a043a9, `TCG` c601734), com as otimizações de 2026-09-26. Falta olhar na tela (computador e celular). Observações do Codex: o `enzo-secreto` mostra também nariz e bochecha; o selo do `carta-leitor` não tem forma clara de macarrão.
- 2026-09-26 (noite): física da Caçada fica como está (120 passos/s), decisão do Henrique: gosta da sensação.
- 2026-09-26 (tarde):
  - **Otimizações de código:**
    - `js/senha.js` (uma janela de senha só, aceita acento e espaço);
    - `js/api-cliente.js` (um pedido à API só; o Baralho também usa);
    - paginação das cartas por (data, id);
    - cursores numa lista só;
    - telha que cai e gravidade duplicada fora da Caçada;
    - build sem versão web dos sprites da Caçada;
    - pacote `jose` instalado (testes do `cloudflare` passam).
  - **Capa do Capítulo 2:** glitch só com o mouse em cima; sem hover, capa normal.
  - **Agente DeepSeek:** NVIDIA grátis primeiro; se não responder em 240 s, API oficial; sem saldo,
    OpenRouter.
- 2026-09-26:
  - **Caçada:** sprites limpos, sem linhas fantasma (Capanga-Mor, Degustador, Sombra, punho) e sem
    pedaços soltos (13 sprites). No ar.
  - **Login:** convite no meio da tela listando tudo o que o login libera (itens do Baralho e da
    Batalha só no `TCG`). No ar.
  - **Revisão de código completa** (6 áreas) com ~90 correções de bugs, lentidão e código com cara de
    IA. No ar.
  - **Ronda guardada;** créditos dela tirados do Baralho.
  - **Cabo Côco:**
    - todas as aparições cobertas sem a senha: alt da ficha, terminal admin, erro da API, texto da
      Batalha;
    - leitor libera com a conquista mesmo sem login;
    - máscara corrigida.
  - **Batalha:**
    - efeito do campo aparece na mesa;
    - efeitos com imagem nos ataques e poderes.
  - **Cursores novos** no site.
  - **Agente DeepSeek:** ligado, com logs por processo e `Bridge/tools/ds-uso.mjs` para ver o gasto.
