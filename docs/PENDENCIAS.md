# O que falta fazer

> **Documento vivo.** O Claude atualiza no fim de cada tarefa: tira o que ficou pronto (vai para
> "Feito recentemente" com a data), acrescenta o que ficou pendente e reordena as prioridades.
> O Henrique pode marcar `[x]`, riscar, mudar a prioridade ou escrever um comentário em qualquer
> item (ex.: `> Henrique: deixa para depois`); o Claude segue isso na próxima atualização.
> Testes que faltam rodar ficam em [`TESTES-PENDENTES.md`](TESTES-PENDENTES.md) (não repetidos aqui).
>
> Última atualização: **2026-10-04**.

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

- **2026-10-04 — Degustador da Noite, capítulo 7 (escondido):** capa e 13 páginas no site, com `hidden: true`. Publicar ou agendar pela aba lançamentos do terminal. Falta o título do capítulo (hoje aparece "Capítulo 7").

- **2026-10-01 · Capa de verdade do Felipe Robozão (cap. 1):** entrou a capa gerada pelo Henrique no Codex (`assets/Spin Offs/Felipe Robozao/Capitulo 1/Capa/capa.png`, 941×1672, sem perda), no lugar da provisória (apagada). O texto da capa (título "A origem do Robozão", preço, "Gibi Games", "Editora Butico", código de barras) é da arte original, não foi mexido.

- **2026-10-01 · Músicas do Felipe Robozão (cap. 1) nas páginas e Discografia:** páginas 2 e 5 têm o botão desenhado "APERTE PARA OUVIR" clicável e a página 7 tem os três balões de música clicáveis; cada um toca um trecho de 29 s (MP3) e só uma música toca por vez. "💿 Discografia" com capa + música inteira no fim do capítulo (antes das Cartas dos Leitores) e na página do ZeZoVerso, abaixo das fichas. Dados em `assets/audio/musicas.json` (faixas, trechos, áreas em %), módulo `js/musicas.js`, arquivos em `assets/audio/felipe-robozao/`; testes em `test/musicas.test.js`. Letras transcritas por IA (Gemini, OpenRouter): cortes aproximados (±2 s). **Confirmar:** quais músicas vão em qual página (2 = Bateu o Carro, 5 = no Poste, 7 = no Asfalto), o título "Robozão no Asfalto" (veio da letra) e a capa dessa faixa — o vídeo dela era só uma foto de uma pessoa real, que NÃO foi publicada (a capa saiu do painel da página 7).

- **2026-10-01 · Felipe Robozão, capítulo 1 "Origem" (9 páginas) no ZeZoVerso, já no ar** (spin-off novo `felipe-robozao`, order 140, entra sozinho na estante do ZeZoVerso). **Capa provisória:** o capítulo veio sem capa, então a capa é a página 1 com o título "FELIPE ROBOZÃO / Nº 01" por cima (`tools/capas-provisorias.js`, que agora usa o nome de cada spin-off) — dá para pedir uma capa de verdade ao Codex. Título "Origem" e descrição "A origem de Felipe Robozão" vieram do roteiro (confirmar). Falta: conquista "ler tudo" (precisa de arte) e a ficha `PERSONAGENS/Felipe Robozão Ficha.png` não foi para o site.

- **2026-10-01 · Partidas online abandonadas se encerram sozinhas:** partida "jogando" sem nenhuma jogada há 10 minutos vira `fim` com motivo `abandonada` (sem resultado, fora do placar, sem créditos) — `varrerAbandonadas` em `api/tcg.js`, chamada quando alguém pergunta se já está numa partida (`/api/tcg/atual`, criar/entrar em sala) e quando o terminal abre `tcg`. Antes elas ficavam "jogando" para sempre e prendiam os dois jogadores ("você já está numa partida"). O terminal mostra "rolando agora" (só as ativas) e "encerradas por abandono" (últimas 20, guardadas 7 dias). `REGRAS_VERSAO` não mudou.

- **2026-10-01 · Histórico das partidas da Batalha no terminal (`tcg [jogador]`):** lista as partidas online que terminaram (data, quem jogou, quem ganhou ou empate, motivo, rodadas, botão "decks" com as 15 cartas de cada um), as que estão rolando agora e "mais antigas" para paginar; filtra por nome, e-mail ou id. Rota `GET /api/admin/tcg/partidas` (`api/admin.js`), dados de `tcg_resultados` (guardados para sempre) e `tcg_partidas`. Também no card PARTIDAS da central. Só online: as contra o NPC não ficam guardadas. Testes em `test/admin-tcg.test.js`. **Falta:** ver com partidas reais; replay passo a passo (as jogadas só ficam enquanto a partida existe).

- **2026-10-01 · Decisão do Henrique: a Batalha está equilibrada por ora, sem compensação de vida do nocaute** (nada de ×1,5, ×1,75 ou ×2; fica como está na `REGRAS_VERSAO` 10). Se voltar a incomodar o ritmo (partidas lentas, muitas no limite de turnos), reabrir com as medições de 2026-09-30.

- **2026-10-01 · Acesso antecipado por leitor (aba lançamentos):** em cada capítulo escondido ou agendado, o botão "👥 acesso antecipado" busca leitores por nome ou e-mail e dá (ou tira) o acesso só a eles; eles veem o capítulo no site mesmo antes de publicar, os outros não. Tabela `lancamentos_acesso`; rotas `GET /api/admin/lancamentos/acessos` e `POST /api/admin/lancamentos/acesso`; `GET /api/site/revelados` devolve `meus` (só do leitor logado). O acesso vale até o capítulo ser publicado para todos (continua guardado). Testes em `test/lancamentos.test.js`.

- **2026-10-01 · Degustador da Noite, capítulos 5 ("Amor com Validade", 8 páginas) e 6 ("Uma Noite na Prisão", 28 páginas) subidos ESCONDIDOS** (`hidden` no manifesto) para testar a aba lançamentos: publicar em admin.html → lançamentos. **Conferir antes de publicar:** no cap. 5 a capa é a "PAGINA 00" (sem arquivo de capa separado) e no cap. 6 a página 7 vinha como "rascunho" no nome do arquivo (foi incluída).

- **2026-10-01 · Aba "lançamentos" no terminal (`launch`):** lista todos os capítulos (retroativo: os que já estão no ar entram como "NO AR") com capa, estado e botões **publicar agora**, **agendar** (horário de Fortaleza), **esconder** (2 passos) e **ver como leitor** (`reader.html?...&previa=1`, só admin). Estado por capítulo no banco (`lancamentos`, `api/lancamentos.js`), sem deploy; o site filtra por capítulo (`js/lancamentos.js`, `window.carregarCatalogo`). Ao publicar dá para marcar "avisar": faixa "Novo capítulo!" na home por 7 dias. Capítulo novo nasce escondido com `hidden: true` no manifesto (skill `comicuploader`). Plano em `docs/PLANO-LANCAMENTOS.md`. **Falta:** QA no celular (Gemini) e data de publicação dos capítulos antigos.

- **2026-10-01 · Visual do Degustador da Noite com arte do Codex (tarefa 05):** fundo de skyline noturna com lua, banner da edição mais recente com cenário de telhado (no lugar da capa borrada), estante de madeira de caixote roxa, prateleira com fita de perigo, lombadas, plaquinha, divisor de morcego embaixo dos títulos, morcegos de papel no canto (só ≥ 900 px) e letreiro novo em alta resolução (`assets/degustador-pagina/`). Visual antigo de reserva no CSS. **Falta:** conferir no celular.

- **2026-10-01 · Visual do ZeZoVerso com arte do Codex (tarefa 04):** fundo cósmico, nebulosa sutil (opacidade 0,2, anda devagar), parede de cristal e prateleira da estante, lombadas, plaquinha, divisor embaixo de cada título, buraco negro girando ao lado do letreiro (só em telas ≥ 900 px) e letreiro novo em alta resolução (`assets/zezoverso/`). Tudo com o visual antigo de reserva no CSS. **Falta:** olhar a repetição das texturas no celular (a emenda não é garantida) e a tarefa 05 (Degustador).

- **2026-10-01 · Hatsune Neves, capítulo 1 "O poder do Magic" no ZeZoVerso:** spin-off novo (`hatsune-neves`, order 130, `featured: false`) com capa e 14 páginas (PNG sem perda, 80 → 59 MB); estante nova em `zezoverso.html#hatsune-neves`; botão "voltar" do leitor (`CASA`) aponta para ela; teste do orçamento de capas subiu de 3,0 para 3,5 MB. **Falta:** conquista "ler tudo" (precisa de arte do Codex), ligar o Bairro das Mansões do mapa ao gibi, conferir a descrição da capa.

- **2026-09-30 · Animações sempre ligadas (pedido do Henrique):** o padrão agora ignora o pedido do navegador/sistema (`prefers-reduced-motion`); só desliga se a pessoa tocar em "🎞️ Animações" no menu da Batalha (fica em `localStorage enzo-movimento = nao`). Os blocos CSS antigos de reduced-motion foram neutralizados (o global `html[data-movimento=nao]` cobre o modo desligado).

- **2026-09-30 · Opera GX "tudo estático":** causa mais provável (não consegui testar no Opera GX): o navegador/sistema informa `prefers-reduced-motion: reduce` e o site, de propósito, desliga todas as animações (`css/style.css` e os `matchMedia` dos scripts). Agora existe `js/movimento.js` (em todas as páginas): a pessoa escolhe **ligar** ou desligar as animações, e a escolha vale para o CSS e para os scripts. No menu da Batalha tem o botão "🎞️ Animações" (avisa quando o navegador está pedindo menos animação). Falta confirmar no Opera GX do Henrique; se continuar parado com as animações ligadas, o problema é outro (me mandar o que aparece no console).

- **2026-09-30 · Fliperama 3D removido da home:** no lugar da máquina ficam só os cartões dos jogos (Flappy Enzo, Caçada ao Inominável, Batalha dos Torados, Degustação Noturna em breve) em `js/jogos-home.js` + `.jogo-cartao` no `css/style.css`. Saíram `js/arcade-home.js`, `js/fliperama-arcade.js`, o three.js (`assets/fliperama-3d/vendor`) e as 4 fotos da máquina; as capas dos jogos continuam em `assets/fliperama-3d/jogos/`.

- **2026-09-30 · Piscina, online só customizado, virada ao derrubar (REGRAS_VERSAO 9, ainda não publicada até o push):** (1) a Piscina de Macarronada cura 400 do ativo de quem a joga no mesmo turno (e continua curando o de quem vai jogar no começo de cada turno); (2) salas e partidas online só aceitam o deck customizado (`lerDeckOnline`; a tela online pede para montar o deck se não houver; os testes salvam um deck customizado por jogador); (3) toda carta que derruba outra fica virada até o próximo turno do dono, depois de a vida do dono da carta cair (saiu a flag `recargaSeDerrubar` e o "de um golpe só"). **Equilíbrio com tudo isso (robô normal, banimento ligado, 1500 partidas):** hoje 25,7 turnos, 28,9% chegam ao limite, quem começa vence 48,5%. Subindo a vida do nocaute: ×1,5 = 19,6 turnos / 5,1% / 49,2%; ×2 = 15,7 / 1,6% / 49,6%; ×2,5 = 14,1 / 0,9% / 50,6%. **Decisão do Henrique:** qual compensação (meta: 16–22 turnos e menos de 3% no limite; ×1,75 deve cair no meio).

- **2026-10-01 · Banimento só de cartas diferentes (REGRAS_VERSAO 10):** cada jogador bane até 2 cartas, mas nunca as duas cópias da mesma carta (`R.quantasBanir`; a tela desabilita a cópia da carta já marcada; se o deck tiver só 1 carta diferente não lendária, bane 1). Testes novos em `test/tcg-regras.test.js`.
- **2026-09-30 · Banimento de cartas, contador de rodadas e moeda consistente (REGRAS_VERSAO 9):** antes de qualquer carta ir à mesa cada jogador bane 2 cartas não lendárias do deck do outro (em segredo, ao mesmo tempo; não pode deixar o deck sem lutador). Engine: fase `banimento`, jogada `banir`, `criarPartida({banimento:true})` (o online e o NPC usam; os testes e o simulador só com `BANIR=1`); a visão mostra a lista do deck do adversário só nessa fase; o robô bane os lutadores mais fortes. Tela: janela de escolha (com descrição colorida), espera, resultado "Cartas banidas!". Contador "Rodada N/15" no alto da mesa. A moeda de quem começa agora mostra para todos (os dois e quem assiste) o mesmo texto: "Nome = CARA · Nome = COROA" e o nome de quem começa (antes cada um lia "Você é GAMES/TORADO"). Simulação com banimento (2000 partidas): quem começa vence 48,0%, 24,0 turnos (o ritmo lento vem da remoção do golpe extra: ainda falta escolher a compensação). Falta ver com duas pessoas online de verdade.

- **2026-09-30 · Sem golpe extra (REGRAS_VERSAO 8) e tela online com a arte:** derrubar uma carta não fere mais o jogador com o dano cheio; o dono perde só a vida da raridade. **Efeito no equilíbrio (robô normal, 2000 partidas):** turnos em média 24,4 (meta 16–22), 19% das partidas chegam ao limite de 30 turnos (meta <3%), quem começa vence 45,4% (meta 48–55%). Simulei compensar subindo a vida do nocaute: ×1,5 (1.125/1.690/2.250/3.375) dá 18,8 turnos, 2,7% no limite e 47,3%; ×2 dá 15,3 turnos, 1,0% e 48,8%. **Decisão do Henrique:** qual compensação (ou nenhuma). As imagens da tela online (`sala-*.png`, que o Henrique trouxe em `comic-reader/assets/Batalha`) foram copiadas, registradas (`node atualizar.js`) e conferidas: o botão Entrar usa `sala-icone-lista.png`.

- **2026-09-30 · Tela online pronta para as imagens (tarefa 02 do Codex):** o código já usa `assets/Batalha/sala-{fundo,cabecalho,caixa,icone-criar,icone-entrar,icone-assistir,espera,vazia,vs}.png` quando existirem (sem o arquivo, tudo fica como antes). Falta o Henrique rodar o Codex em `E:AI WorkshopCodexBridge` ("faça a próxima tarefa"); depois: `node conferir.cjs tarefas/02-sala-online.md`, `node atualizar.js` (registra em `js/images.generated.js`), olhar a tela, commit e push.

- **2026-09-30 · Tela "Outro jogador" simplificada:** só o botão **Criar sala**; logo abaixo uma lista única (renova a cada 3 s) com as salas esperando (Entrar) e as partidas ao vivo (Assistir). Saíram os botões "Lista de salas" e "Assistir" e as telas separadas. Plano de assets (fundo, cabeçalho, moldura, ícones) só no chat; falta o Henrique mandar as imagens.

- **2026-09-30 · Superkid e Encantadora (REGRAS_VERSAO 7):** a Aura de 67 Segundos do Superkid deixa ele virado quando derruba qualquer carta (antes só de um golpe só; flag `recargaSeDerrubar`). O Vem Cá da Encantadora virou **poder** (1x por turno, de qualquer lugar da mesa, como o da Hatsune): escolhe quem vem do banco do rival e ela fica virada por 1 turno; o único ataque dela é a Chama Rosa. Testes e simulação (2000 partidas, Encantadora 47,6%) ok. Interpretei "enfasada" como **virada** (não ataca, não usa poder, não recua por 1 turno): confirmar com o Henrique. Animação do laço agora no poder (`EFEITOS_PODER`).

- **2026-09-30 · Montador de decks e chat:** o montador agora tem painel fixo à esquerda (contadores, nome, erro e botões, sem barra por cima das cartas) e a lista de cartas rolando ao lado, cada carta com nome, frase e descrição (`tcg`). O chat da partida, em telas de 1120px ou mais, fica sempre aberto numa coluna ao lado da mesa (a mesa cede a largura, `:has(> .bt-chat)`); abaixo disso continua o botão 💬. Conferido só em emulação (1024 e 1366): falta ver numa partida online de verdade.

- **2026-09-30 · Sem limite de partidas online:** saíram os limites de 50 partidas/dia no site e 10 por jogador (`conferirLimites` em `api/tcg.js`; teste T7 removido). O limite de créditos contra o NPC (10 premiadas/dia) continua. Se o custo do servidor preocupar, o freio pode voltar.

- **2026-09-30 · "Criar sala" sem resposta:** o erro do servidor (ex.: limite de 10 partidas online por dia, 429) era mostrado em balão, que só existe na mesa e ficava mudo no menu. Agora o erro aparece como aviso vermelho flutuante (`balao` em `js/batalha.js`). Se o Henrique ainda vir a sala não abrir, o motivo aparece escrito.
- 2026-10-01: **Admin posta decks oficiais em "Decks de players":** no editor do deck, quem é admin ganha **📌 Postar como oficial** (usa as 15 cartas, o nome e a descrição do editor; vários, sem mexer no deck pessoal). Eles aparecem primeiro na lista com ⭐ e "Deck oficial · Enzo Games"; todo jogador pode **Usar este deck** (copiar) e o admin vê **🗑️ Remover da lista**. API: `POST /api/tcg/decks-postados`, `.../:id/remover` (só admin; log `deck-postar`/`deck-remover`), tabela `tcg_decks_postados`. As **regras do deck valem também para os oficiais** (15 cartas, 2 lendárias, 2 cópias) porque o jogador copia o deck para o dele e ele precisa ser jogável; se quiser um deck oficial fora dessas regras (ex.: os 3 prontos com 3 lendárias) é outra decisão. Testes: D5. **Falta:** editar um oficial já postado (hoje: remover e postar de novo).
- 2026-10-01: **Decks de players:** no editor do deck customizado há nome (30 letras), descrição (80) e dois botões de salvar: **Salvar deck** (privado) e **Salvar e listar** (aparece para os outros; se já está listado, vira "Salvar (continua listado)" e "Salvar e tirar da lista"). Sem links no nome/descrição. Menu da Batalha ganhou o botão **👥 Decks de players** ("Veja e copie os decks que outros jogadores listaram"): lista (mais novos / mais copiados), ver cartas e **Usar este deck** (copia para o seu, substitui o atual, a cópia não fica listada; contador de cópias). API: `GET /api/tcg/decks-publicos`, `POST /api/tcg/decks-publicos/:id/copiar`, `POST /api/tcg/deck` com `nome/descricao/publico`; colunas novas em `tcg_deck_custom`. Moderação: admin vê o deck na ficha da conta e tira da lista (`undeck` ou botão; log `deck-despublicar`). De quebra: os diálogos da Batalha estavam colados no canto (reset de margin do site) e voltaram ao centro. Teste: D4 em `test/tcg-deck-custom.test.js`. **Falta:** QA no celular de verdade; denúncia de deck pelos jogadores (hoje só o admin tira da lista).
- 2026-10-01: **Deck customizado (4º deck da Batalha):** cada conta monta o seu com **qualquer carta do jogo (cartas infinitas, não depende da coleção)** (menu → "Seu deck" → Montar/Editar): 15 cartas, **no máximo 2 lendárias** (1 cópia de cada) e até 2 cópias das outras. Servidor: `GET/POST /api/tcg/deck` (tabela `tcg_deck_custom`), sala/partida/revanche aceitam `deck: 'custom'` (a lista vai junto em `tcg_salas.lista` e `tcg_partidas.lista_a/b`); a lista é conferida de novo a cada sala/entrada. Motor: `validarDeck(ids, {colecao, maxLendarias})` e `MAX_LENDARIAS_CUSTOM` (sem mudar `REGRAS_VERSAO`: não altera a jogada). Decks prontos continuam como são (a Turma tem 3 lendárias). Teste: `test/tcg-deck-custom.test.js`. **Regra escolhida por mim (mudar se quiser):** repetição das não lendárias = 2 cópias (a regra que já existia). **Falta:** QA no celular de verdade; números de calibragem não mudam.
- 2026-09-30: **Plano do Party Enzo** (TV host + celulares como controle) em `docs/PARTY-PLANO.md`: regra de latência (celular julga, TV só mostra), servidor de sala com Durable Object no mesmo repositório, protocolo, formato de partida e catálogo de 8 minigames (Corte do Bife, Reflexo do Torado, Sprint de Macarrão, Parada do Relógio, Batida do Enzo, Desenhe o Inominável, Quiz da Saga, Equilíbrio). **Aguardando o Henrique** decidir os itens da seção 7 (Durable Object, quais minigames, tamanho da sala, login, pontuação, avatares).
- 2026-09-30: **iPhone pedindo login toda vez (amigo do Henrique, iPhone 14 Pro Max):** causa ainda **não confirmada** (o cookie já era `Secure; HttpOnly; SameSite=Lax; Max-Age=30d`, normal para o Safari). Mitigações: cookie agora leva `Expires` além de `Max-Age` e é renovado a cada dia de uso; o site lembra no aparelho que já entrou (`enzoJaLogou`) e, se a sessão não voltar, avisa o servidor (`POST /api/visita {perdida:true}`, 1x/dia) que grava o evento `sessao-perdida` com IP, operadora e **aparelho** (`iPhone 17 · Safari`, `iPhone 17 · Instagram (app)`…). No terminal, `anonimos` mostra isso na coluna aparelho. **Reforço (mesmo dia):** "chave do aparelho": o login devolve uma chave que o site guarda no localStorage (`enzoLembrar`); se o cookie sumir, `POST /api/auth/restaurar` troca a chave por sessão nova + chave nova (a velha vale 2 min; 90 dias; some ao sair/banir/derrubar; não conta como sessão). Evento `sessao-restaurada` no registro de acessos mostra quantas vezes o cookie sumiu. Testes: `test/auth-lembrar.test.js`. Não resolve aba privada nem "bloquear todos os cookies". **Falta:** depois do deploy, ver no `anonimos`/`ip` se o aparelho dele é app embutido (Instagram/WhatsApp/Discord), aba privada ou Safari com cookies bloqueados e agir conforme.
- 2026-09-30: **Admin mexe em todo o inventário de qualquer conta (terminal):** cartas (`card <n|id|nome> [+n|-n|=n]`, `cards all` dá as que faltam, `cards clear` esvazia, `cards` lista), pacotes fechados (`unpack <id|all>`), conquistas e Enzos secretos em lote (`grant|revoke all|conquistas|secretos`), além de créditos, pó e pacote que já existiam. Na ficha da conta há botões −/+/tirar por carta, `tirar` por pacote e botões em lote (tirar pede 2º clique). API: `POST /api/admin/users/:id/cartas`, `.../pacotes/remover`, `.../achievements`; tudo vai para `admin_log`. Testes: `test/admin-inventario.test.js`. **Não feito:** presente para todas as contas de uma vez (global).
- 2026-09-30: **Painel de guerra no terminal admin** (`js/admin-deck.js`, dados reais de `GET /api/admin/acessos/radar`): RADAR com mapa-múndi de pontos, varredura e ping a cada acesso novo; TRÁFEGO 24h (logados x sem login) com osciloscópio; FEED ao vivo (clique numa linha abre `ip <endereço>`); MEM hexdump (enfeite). Coluna fixa à direita em telas ≥1180 px; em qualquer tela o comando `radar` abre o mesmo painel dentro do terminal. Atualiza a cada 15 s. A API passou a guardar `lat`/`lon` (colunas novas em `acessos`, de `request.cf.latitude/longitude`), então o mapa só enche com acessos **depois do deploy**. Continentes são polígonos grosseiros desenhados à mão (só enfeite).
- 2026-09-30: **Terminal admin repaginado (estilo netrunner):** `css/admin-hacker.css` (HUD com cantos, neon ciano/magenta, varredura, glitch) e `js/admin-fx.js` (chuva de código em canvas, fita de telemetria, sequência de boot 1x por sessão; clique/tecla pula). **Sistema de cores com regra** (comentado no topo do bloco em `admin-hacker.css`): verde = ok/dados, ciano = informação/sistema, magenta = pessoas/admin, âmbar = economia/privilégios/avisos, laranja = IPs e lugares, violeta = datas/ids/gibis, azul = jogos, vermelho = perigo; botões herdam a cor pelo `title` (comando) e `admin-fx.js` realça datas, IPs e ids no texto. Só visual: a lógica de `js/admin.js` não mudou. Ajustado para celular (375 px): boot com pontilhado flexível, fita de telemetria escondida, alvos de toque ≥36 px, chuva e painel com menos quadros por segundo. Desliga com `prefers-reduced-motion`. Conferido no desktop e em 375 px emulado; falta ver em celular de verdade (desempenho da chuva).
- 2026-09-30: **Registro de acessos (segurança):** `api/acessos.js` grava IP, país, estado, cidade e operadora (de `CF-Connecting-IP` e `request.cf`/cabeçalhos da Cloudflare) em login, partida do arcade, cartas, compras/abertura de pacotes, salas e comentários da Batalha, NPC e ações de admin, mais uma "visita" por conta+IP a cada 30 min; some depois de 60 dias (tabela `acessos`). **Visitante sem sessão também:** as páginas chamam `POST /api/visita` (1x a cada 30 min por navegador, `avisarVisita` em `js/auth-widget.js`) e o servidor grava IP, lugar e página, no máximo 1 por IP a cada 30 min (`evento` = `visitante`); terminal `anonimos`. Só admin lê: terminal `ips` (lugares, IPs repartidos entre contas, recentes), `ip <endereço>`, `onde <estado|cidade|país>` e a seção "acessos" da conta aberta. Só vale a partir do deploy (antes disso há só `last_login_at` por conta). Local não tem IP nem lugar. Testes: `test/acessos.test.js`. **Falta:** conferir no site publicado se a Cloudflare manda cidade/estado (senão ativar "Add visitor location headers" em Rules → Transform Rules → Managed Transforms); citar o registro na política de privacidade.
- 2026-09-30: **Batalha: comentários da partida e modo espectador :** "Outro jogador" ganhou **Assistir** (lista de partidas ao vivo, `GET /api/tcg/ao-vivo`; entra como espectador por `GET /api/tcg/assistir/:id`, sem as mãos e sem jogar). Um chat 💬 na mesa para quem joga e quem assiste (`/api/tcg/partidas/:id/comentarios`, sem limite de quantidade nem de ritmo; só um teto técnico de 500 caracteres por mensagem) que **some quando a partida termina** (tabela `tcg_comentarios` apagada em `registrarResultado`). Testes T14/T15 e conferido no navegador com 2 jogadores simulados + 1 espectador. Testado no formato de celular (375×812): menu, lista ao vivo, mesa de jogador e de espectador e o chat com botão de fechar. Sem moderação de propósito (pedido do Henrique). Falta: contador de espectadores. O documento `docs/BATALHA-DOS-TORADOS.md` vai junto no push.
- 2026-09-30: **Flappy Enzo agora rende 100 créditos por ponto** (era 10; `CREDITOS_POR_PONTO` em `js/baralho-dados.js`). Um pacote do Estacionamento (100 créditos) sai com 1 ponto; conferir se a economia dos pacotes (preços em `PACOTES`) ainda faz sentido com esse ganho.
- 2026-09-30: **Capítulo 8 publicado de vez** (a pedido do Henrique, antes das 10h): `hidden` e `revealAt` saíram do manifesto. O suporte a `hidden`/`revealAt`, `reveal`/`hide` no terminal e a hora do servidor continuam prontos para o próximo capítulo escondido.
- 2026-09-30: **Capítulo 8 abre sozinho às 10:00 (Brasília) de 30/09/2026:** `revealAt` no manifesto (`capitulo-8`), comparado com a hora do servidor (`/api/site/revelados` devolve `agora`), então o relógio do aparelho não conta; conferido às 09:59:59 (escondido) e 10:00:00 (visível). Quem já está com a página aberta vê ao recarregar. `hide capitulo-8` não segura depois das 10h (o horário vale); para esconder de novo, tire o `revealAt`/`hidden` do manifesto. Depois que abrir, dá para apagar `hidden`/`revealAt` do manifesto.
- 2026-09-30: **Créditos do Baralho (para comprar pacotes):** Flappy Enzo 10 por ponto (já valia); Batalha online 500 (vitória) / 150 (derrota ou empate), pagos pelo servidor uma vez por partida (`registrarResultado` em `api/tcg.js`); contra o NPC 250 / 50 pela rota `POST /api/tcg/npc`, com trava (10 partidas premiadas por dia, 90 s entre elas, e desistir não rende), porque a partida roda no navegador e o servidor não confere. Valores em `CREDITOS_BATALHA` (`js/baralho-dados.js`). A tela de fim mostra "+N créditos" e a Carteira lista os valores. Decisão sobre empate (paga como derrota) e as travas do NPC: confirmar com o Henrique.
- 2026-09-30: **Batalha online com salas públicas (sem código) e revanche:** "Outro jogador" mostra **Lista de salas** e **Criar sala**. A sala fica **5 minutos** na lista e o tempo recomeça enquanto a tela de espera do dono está aberta (`SALA_DURA` em `api/tcg.js`; sem a tela aberta, some em 5 min). Entrar é 1 clique; sumiram o código e o link `?sala=`. Ao fim de uma partida online aparece **Revanche**: os dois pedem (2 min para pedir, `REVANCHE_DURA`), nasce outra partida com os mesmos decks e lados trocados; o botão avisa "X quer revanche!". Colunas novas `revanche_a/b/id` em `tcg_partidas`. A lista mostra só salas esperando (sem "em andamento"). Testado com 2 contas simuladas; falta teste com duas pessoas de verdade.
- 2026-09-30: **Fliperama é a única porta dos jogos:** ao clicar, a máquina se aproxima e a tela mostra as capas com nome (Flappy Enzo, Caçada ao Inominável, Batalha dos Torados; Degustação Noturna aparece "Em breve", pois está arquivada em `arquivo/ronda/`). Capas em `assets/fliperama-3d/jogos/*.webp`; `js/main.js` expõe `window.EnzoJogos.abrir`. Removidos: clique no logo (Flappy), no título do Degustador (Caçada) e a porta secreta do Enzo nº 99 (Batalha). `batalha.html` continua existindo (noindex). Só visto no navegador local, em tela estreita; falta olhar no computador e no celular de verdade.
- 2026-09-30: **Censura do Cabo Côco sem senha:** `js/senha.js` foi apagado; ninguém digita mais senha (fichas, leitor e cartas). Marcador por conta `users.censura_liberada` (começa travado para todos, inclusive quem já tinha a conquista), controlado só pelo terminal admin: `censura on|off` (ou botão na conta aberta; 🔓 na lista de leitores). Rota `POST /api/admin/users/:id/censura`, log `censura-on/off`. A conquista "Acesso Confidencial" agora só sai por `grant cabo-coco` (decidir se `censura on` deve dar junto). Falta rodar `npm run build` para os 3 testes da máscara do Cabo Côco (arquivo gitignorado).
- 2026-09-30: **Terminal admin interativo (mesmo visual hacker ASCII):** a tela é substituída em vez de empilhar linhas (migalhas ‹ voltar / ↻ / Esc), uma linha de aviso única (`>>`), busca ao vivo em leitores e linhas clicáveis, números do painel clicáveis, conta com seções dobráveis, botões de créditos/pó (±10…1000), pacotes, fala editável, ban/kick/apagar com "certeza?" no próprio botão, gibis escondidos com [revelar]/[esconder]. Comandos digitados continuam valendo. Só conferido no navegador local; falta olho do Henrique no celular.
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
