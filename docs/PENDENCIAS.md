# O que falta fazer

> **Documento vivo.** O Claude atualiza no fim de cada tarefa: tira o que ficou pronto (vai para
> "Feito recentemente" com a data), acrescenta o que ficou pendente e reordena as prioridades.
> O Henrique pode marcar `[x]`, riscar, mudar a prioridade ou escrever um comentário em qualquer
> item (ex.: `> Henrique: deixa para depois`); o Claude segue isso na próxima atualização.
> Testes que faltam rodar ficam em [`TESTES-PENDENTES.md`](TESTES-PENDENTES.md) (não repetidos aqui).
>
> **Fica no branch `TCG`** (cita o Baralho). Última atualização: **2026-09-26**.

**Legenda:**
- **Quem:**
  - 🧑 Henrique (decisão ou arte);
  - 🤖 Claude;
  - 🐋 DeepSeek (via Claude);
  - ♊ Gemini.
- **Onde:** `main` = site no ar; `TCG` = Baralho/Batalha.

---

## 🔴 Agora (prioridade alta)

- [ ] **Saldo do DeepSeek no fim (US$ 0,17).** Dá para ~3 tarefas médias. Recarregar uns US$ 5 ou
  usar a reserva grátis da NVIDIA (`--provedor nvidia`, lenta). 🧑
- [ ] **Push do `main` e do `TCG`.** Os dois estão à frente do GitHub com as otimizações de código de
  2026-09-26 (testadas no navegador). 🤖 quando o Henrique pedir.

## 🟠 Próximos

### Arte
- [ ] **46 ícones para trocar os emojis** do site, com prompts e nomes prontos em
  [`ICONES-SITE.md`](ICONES-SITE.md). Depois de gerados, o Claude troca no código (pedido pronto no fim
  do doc). 🧑 gerar → 🤖 encaixar.
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

- [ ] **Caçada:** física roda a 120 passos por segundo (o dobro do comum). Não mexido de propósito:
  muda a sensação do jogo. Os eventos sem ouvinte ficam (servem para o som, que ainda não existe).
- [ ] `moverY` da Caçada ainda devolve `tx`/`ty` que ninguém lê (sobra da telha). Detalhe.
## 📦 Guardado (não é pendência, é para lembrar)
- **Degustação Noturna (Ronda):** em `arquivo/ronda/` desde 2026-09-26, com README de como voltar.

---

## ✅ Feito recentemente
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
