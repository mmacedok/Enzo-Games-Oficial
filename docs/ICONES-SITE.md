# Ícones do site: imagens para trocar os emojis

> **Fica no branch `TCG`** (cita o Baralho e a Batalha; ver `CLAUDE.md`). As imagens do site em
> si (seções 1 a 5) podem ir para o `main` normalmente; as das seções 6 e 7 só no `TCG`.
> Levantamento feito em 2026-09-26: 52 emojis diferentes no código. Esta lista cobre todos os que
> aparecem na tela; os que ficam de fora estão no fim, com o motivo.

## Como funciona
- O site já tem a troca pronta: `siteIcon('nome', '🏆')` mostra **`assets/ui/nome.png`** quando a
  imagem existe e o emoji quando não existe. Onde a tabela diz **"automático"**, basta salvar a
  imagem com o nome certo e rodar `npm run build`.
- Onde diz **"código"**, o emoji está escrito direto no texto. Quando as imagens chegarem, um Claude
  troca esses pontos para usar a imagem (pedido pronto no fim).
- **Peso:** cada ícone vira um `.webp` de 2 a 6 KB e só baixa na página que usa. Os 60 juntos
  somam uns 300 KB. Não pesa no site.

## Regras para todos os ícones
- **PNG com fundo transparente de verdade** (canal alfa, não xadrez desenhado).
- **Ícones pequenos: 256×256.** Figurinhas de conquista: **512×512**.
- Aparecem pequenos (20 a 48 px na tela): **forma simples, que se reconhece pela silhueta**,
  um objeto só, centralizado, com uns 8% de margem. Nada de cenário.
- **Sem texto, letra ou número** na imagem.
- Todos com o mesmo contorno e a mesma luz, para parecerem da mesma família.

## Bloco de estilo (colar no começo de TODO prompt)
```
Ícone de interface no estilo tira de jornal vintage (Garfield, Jim Davis): contorno de nanquim
preto grosso e uniforme, cores quentes e saturadas, sombra chapada simples, leve textura de retícula.
Um único objeto centralizado, legível em tamanho pequeno, fundo 100% transparente.
SEM NENHUM TEXTO, letra ou número.
```
Para os que citam personagem, anexe a ficha dele como referência e diga *"mantenha exatamente a
aparência do personagem da imagem de referência"*.

## Prioridade
1. **Convite de login e conta** (seção 1): é a primeira coisa que o visitante vê.
2. **Figurinhas das conquistas** (seção 2): o álbum da Ficha é todo feito delas.
3. Senha, leitor e comentários (seções 3 a 5).
4. Baralho e Batalha (seções 6 e 7, só `TCG`).

---

## 1. Conta, convite de login e ranking (`assets/ui/`, 256×256)

| Arquivo | Troca | Onde aparece | Troca | Prompt (depois do bloco de estilo) |
|---|---|---|---|---|
| `trofeu.png` | 🏆 | botão Placar global, título do ranking, contador de conquistas, convite (Ranking), fim de jogo | automático (+ código no texto do fim de jogo) | `troféu dourado de gibi com alças grandes e uma almôndega no topo no lugar da estrela` |
| `chave.png` | 🔑 | botão Entrar no topo, avisos "entre com Google" | automático (+ código nos avisos) | `chave antiga de ferro com a argola em forma de garfo` |
| `medalha-1.png` | 🥇 | 1º lugar do ranking; convite (Conquistas) | código | `medalha de ouro com fita laranja e o número 1 gravado em relevo` (única com número) |
| `medalha-2.png` | 🥈 | 2º lugar do ranking | código | `medalha de prata com fita roxa e o número 2 em relevo` (única com número) |
| `medalha-3.png` | 🥉 | 3º lugar do ranking | código | `medalha de bronze com fita verde e o número 3 em relevo` (única com número) |
| `convite-cacada.png` | 🎮 | convite: Caçada ao Inominável | código | `máscara roxa do Degustador da Noite com olhos brilhando, vista de frente` (ref.: `assets/Personagens/Degustador da noite Ficha.png`) |
| `marcador.png` | 📖 | convite (Continuar de onde parou) e aviso "Continuando de onde parou" no leitor | automático no leitor, código no convite | `gibi aberto com um marcador de página vermelho saindo do meio` |
| `carta-leitor.png` | ✉️ | convite (Cartas dos leitores) | código | `envelope de carta fechado com selo de cera laranja em forma de macarrão` |
| `ficha-leitor.png` | 🪪 | convite (Ficha do Leitor) | código | `crachá de identidade de papel com foto em branco e um clipe no topo` |
| `enzo-secreto.png` | 🐱 | álbum dos Enzos secretos, aviso de Enzo achado, contador na ficha | automático | `rostinho do Enzo Games espiando atrás de um canto, só olhos e testa aparecendo` (ref.: `assets/enzo-face-t.png`) |
| `cadeado.png` | 🔒 | figurinha de conquista ainda não conquistada | automático | `cadeado grande de ferro fechado, com um pouco de molho de tomate escorrendo` |
| `aviso.png` | ⚠️ | aviso de erro ao salvar Enzo secreto | automático | `placa triangular amarela de atenção com um ponto de exclamação` (única com símbolo) |

## 2. Figurinhas das conquistas (`assets/ui/`, 512×512, automático)
Aparecem no álbum da Ficha do Leitor e no aviso de conquista. Estilo **figurinha de álbum**:
o objeto dentro de um selo redondo com borda branca grossa, como adesivo.

| Arquivo | Conquista | Troca | Prompt |
|---|---|---|---|
| `conquista-leitor-da-saga.png` | Leitor da Saga | 📚 | `pilha de gibis do Enzo Games com um prato de macarronada fumegando no topo` |
| `conquista-vigilia-completa.png` | Vigília Completa (Degustador) | 🦇 | `silhueta do Degustador da Noite num telhado diante de uma lua cheia amarela` (ref.: ficha do Degustador) |
| `conquista-heroi-de-operator-village.png` | Herói de Operator Village (Superkid) | 🦸 | `capa vermelha do Superkid esvoaçando com um raio amarelo` (ref.: `assets/Personagens/Superkid Ficha.png`) |
| `conquista-olho-do-torado.png` | No Olho do Torado | 🌪️ | `redemoinho de vento com um olho grande e bravo no meio` (ref.: capa do Torado) |
| `conquista-macarronada.png` | Caçador de Macarronada | 🍝 | `prato de macarronada com almôndegas e um garfo espetado de pé` |
| `conquista-acesso-confidencial.png` | Acesso Confidencial | 🥥 | `pasta de arquivo com carimbo vermelho sem letras e um coco rachado saindo de dentro` (não desenhar o Cabo Côco) |

## 3. Janela da senha (Cabo Côco)
| Arquivo | Troca | Onde aparece | Troca | Prompt |
|---|---|---|---|---|
| `sirene.png` | 🚨 | título "Alerta" da janela da senha (fichas, leitor, Baralho) | código | `sirene de polícia vermelha girando, com raios de luz saindo` |
| `acesso-negado.png` | ❌ | "Senha incorreta! Acesso negado." | código | `X vermelho grosso pintado com pincel, respingado` |

## 4. Comentários (moderação do admin)
| Arquivo | Troca | Onde aparece | Troca | Prompt |
|---|---|---|---|---|
| `apagar.png` | ✂ | botão Apagar na carta do leitor | código | `tesoura aberta prateada com cabo laranja` |
| `banir.png` | ⛔ | botão Banir | código | `martelo de juiz preto batendo, com uma faísca vermelha` |

## 5. Jogos (janela do jogo)
Usa `trofeu.png` e `chave.png` da seção 1 (só código nos textos do fim de partida).

---

## 6. Baralho (só `TCG`, `assets/ui/`, 256×256)
| Arquivo | Troca | Onde aparece | Troca | Prompt |
|---|---|---|---|---|
| `convite-baralho.png` | 🃏 | convite de login (Baralho Enzo) | código | `pacote de cartas lacrado e brilhante com uma carta escapando pelo rasgo` |
| `convite-batalha.png` | ⚔️ | convite de login e link "Batalha dos Torados" no Baralho | código | `duas cartas cruzadas como espadas, com um raio amarelo no cruzamento` |
| `po-de-estrela.png` | ✨ | botões "Repetidas" e "Transformar todas as repetidas" | código | `montinho de pó de estrela dourado e roxo brilhando, com estrelinhas no ar` |

## 7. Batalha dos Torados (só `TCG`, **`assets/Batalha/`**, 256×256)
Os ícones de estado, a moeda, a Aura e os ícones do menu **já existem** (`docs/BATALHA-ASSETS.md`).
Faltam estes. Todos no código da batalha (`ARTE` em `js/batalha.js`).

| Arquivo | Troca | Onde aparece | Prompt |
|---|---|---|---|
| `botao-sair.png` | 🏠 | botão do topo: voltar ao menu | `casinha amarela do Enzo Games com telhado vermelho` |
| `botao-historico.png` | 📜 | botão do topo: abrir o histórico | `pergaminho enrolado amarelado com a ponta aberta` |
| `botao-desistir.png` | 🏳️ | botão do topo: desistir | `bandeira branca rasgada num cabo de garfo` |
| `botao-regras.png` | 📖 | botão do topo: regras | use o mesmo `icone-como-jogar.png` do menu (sem imagem nova) |
| `tag-vida.png` | ❤ | selo de HP da carta no painel | `coração vermelho de gibi com brilho branco` |
| `tag-recuo.png` | ↩ | selo de custo de recuo | `seta curva grossa voltando para trás, com rastro de poeira` |
| `mao-cartas.png` | ✋ | contador de cartas na mão do rival | `mão segurando três cartas em leque, viradas para baixo` |
| `relogio.png` | ⏱ | relógio do turno online e aviso de tempo esgotado | `cronômetro de bolso prateado com o ponteiro no vermelho` |
| `nocaute.png` | 💥 | histórico: carta nocauteada | `estouro de gibi amarelo e vermelho em forma de estrela, sem letras` |
| `camera.png` | 📷 | aviso "Câmera!" do Drone Vigia | `câmera de segurança com a luz vermelha acesa` |
| `poder.png` | ✨ | balão quando um poder é usado | `estrela de quatro pontas brilhando em roxo e dourado` |
| `rosto-voce.png` | 🙂 | seu rosto no placar da mesa | `rostinho sorridente genérico de leitor de gibi, com boné laranja` |
| `rosto-rival.png` | 🧑 | rosto do outro jogador na partida online | `rostinho genérico de leitor com boné roxo e cara de desafio` |

O rosto do NPC (😈 no placar da mesa) passa a usar `npc-torado.png`, que já existe (só código).
Os estados (🔔 🔇 💘 🛡️) que ainda aparecem **dentro de textos** (histórico, balões, "Como jogar")
passam a usar os `estado-*.png` que já existem (só código).

---

## O que fica de fora (e por quê)
- **Mensagens do terminal** (✅ ⚠️ 📚 em `atualizar.js`, `server.js`, `lib/`): só aparecem para quem
  roda o site no computador, nunca na tela do leitor.
- **Setas ◀ ▶ ▲ ▼ ↔ ═ ◆** da Caçada: são desenhadas no canvas como texto dos botões e do mapa; a arte
  da Caçada tem a própria lista em `docs/ASSETS-CACADA.md`.
- **☠ e 🌶 no mapa da Caçada**: símbolo de reserva quando falta a imagem; as figurinhas já têm arte
  (`assets/ui/figurinha-*.png`).
- **✔ e · do terminal admin**: o admin é de propósito um terminal de texto.
- **😡 e 👍 nos nomes e frases das cartas** ("Reação 😡", "Num tem eu, num tem 👍"): fazem parte da
  piada (reação do Discord). **Decisão do Henrique (2026-09-26): ficam como emoji.**

---

## Pedido pronto para o Claude (depois de gerar as imagens)
```
Tenho os ícones de docs/ICONES-SITE.md. As imagens estão em <PASTA>.
1. Copie cada uma para o lugar da tabela (assets/ui/ ou assets/Batalha/), com o nome exato.
2. Confira fundo transparente (alfa medido) e tamanho; me diga o que faltou ou veio errado.
3. Rode npm run build.
4. Troque no código os pontos marcados "código" para usar a imagem (siteIcon ou ARTE da batalha),
   mantendo o emoji só como reserva quando a imagem não existir.
5. Olhe no computador e no celular, faça o commit (seções 1 a 5 no main, 6 e 7 no TCG) e me diga
   o que entrou.
```
