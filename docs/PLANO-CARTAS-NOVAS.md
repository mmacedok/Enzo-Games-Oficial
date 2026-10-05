# Plano — cartas novas e mecânicas novas da Batalha dos Torados

Origem: a lista que o Henrique colou em 2026-10-04 (ideias dele, do Enzo e do "Anuah"). A parte que **muda carta ou regra que já
existe** entrou na versão 11 (ver `docs/BATALHA-CHANGELOG.md`). Este plano cobre o que **ainda não existe**: 14 cartas novas e
2 mecânicas novas. Nada daqui está no jogo ainda.

## 1. Mecânicas novas (precisam do motor antes das cartas)

| # | Mecânica | O que a lista pede | Trabalho no motor (`js/tcg-regras.js`) |
|---|---|---|---|
| M1 | **Zona de Resenha** ("campo na horizontal") | Cartas deitadas ao lado de um personagem, valendo só para ele. Duas famílias: *campos* com habilidade aplicada só àquele personagem, e *Resenhas*, que só afetam o personagem em que estão ativas; o efeito é queimado ao entrar ou ao usar | Novo tipo de carta `resenha`; cada instância na mesa ganha `resenhas: []`; jogada `anexar` (da mão para um personagem seu); gancho "ao entrar" e "ao usar"; sai junto com o personagem; visão do jogador/online e tela (carta deitada sob a carta) |
| M2 | **Entidade** | Carta que fica no banco por um número de turnos e age no fim de cada turno (Lavras MG) | Novo tipo `entidade` com contador de turnos e gatilho de fim de turno; não ocupa vaga de lutador, não leva dano |
| M3 | **Carta permanente / passiva de banco** | Efeito contínuo enquanto está no banco (Mariana, PMLDM) | Parecido com o poder `bonusDoBanco` do Stand do Joinha; generalizar para "protege aliado" e "dano espalha" |
| M4 | **Roubar / emprestar Aura** | Hanna rouba 1 Aura do rival; Tiago Cássio rouba toda a Aura por 1 turno e devolve; Pidão do Vape rouba de quem emprestou | Campo `auraEmprestada` com dono e turno de devolução; carta com Aura roubada não ataca naquele turno (regra do Tiago) |
| M5 | **Transformação** | PMLDM vira "Itallo Ezreal" (40/0/100) | Troca o `id` da instância mantendo Aura/dano ou carta de combate temporária; a arte tem uma 2ª versão |
| M6 | **Buscar no baralho** | Itallo de Viego chama um Enzo Games; Júlia ativa Lavras MG; Pedir Skin coloca um Superkid; PMLDM puxa 2 Itallos para a mão | Ação "tirar do baralho" (e embaralhar depois), com a carta entrando virada, no campo ou na mão |
| M7 | **Dano espalhado / dano em todos** | PMLDM: dano do Itallo vai também para todo o banco do rival; 1 Aura: 600 em todos | Passo extra em `executarAtaque` (respeitando "inafetado" do Ezreal) |
| M8 | **Metade do dano / efeito até o fim do próximo turno** | Calibra o Smite | Estado `danoMetade` com prazo, como o escudo |
| M9 | **Tags** | "Carta com a tag Degustador da Noite" (São João do B) | Campo `tags: []` em `js/tcg-cartas.js` (Degustador, Sombra, etc.) |

Ordem sugerida: M9 (trivial) → M3 → M8 → M6 → M4 → M7 → M2 → M5 → **M1 por último** (é a maior: motor, visão online e tela).

**Atualização 2026-10-05 (v12):** a M1 (Resenha) ficou pronta no motor, na tela e no robô, sem carta ainda: jogada `anexar`,
`COMBATE[id].anexo` (ver o cabeçalho de `js/tcg-cartas.js`). A M9 (tags) também (`tags` em qualquer carta, `R.tagsDe`). A
aparência alternativa (`anexo.visual`) já cobre parte da M5. O resto do motor ficou pronto para tipos novos: `TIPOS`/`MODOS`,
`ficha()`, `EFEITOS` e `BONUS_DANO` em `js/tcg-regras.js`.

## 2. As cartas (texto da lista, com a leitura que o Claude fez)

`id` = nome do arquivo da arte (`assets/Cartas/<id>.png`). Raridade entre colchetes é **sugestão** quando a lista não diz.

### Arquétipo do Superkid
| Carta | id | Tipo / raridade | Texto original | Leitura |
|---|---|---|---|---|
| Hanna | `hanna` | personagem [Raro] | "Quando ela entra, rouba uma aura do oponente e coloca no Superkid" | Ao baixar: tira 1 Aura de uma carta do rival e põe no Superkid (M4) |
| Mariana | `mariana` | personagem **Épica** | "Carta permanente: no banco, o Superkid não pode tomar hit kill nem danos por efeito" | No banco, o Superkid não é nocauteado de um golpe só e ignora dano de efeito (veneno, contra-ataque, dano em si) (M3) |
| Júlia | `julia` | personagem **Lendária** | "Quando entra, ativa Lavras MG direto do deck. Não pode estar no campo ao mesmo tempo que o Superkid" | Ao baixar: busca Lavras MG (M6, M2); regra de exclusão com o Superkid |
| Lavras MG | `lavras-mg` | **entidade** [Épica] | "Fica no banco por 2 turnos. No fim de cada turno, o Superkid se torna e farma mais 1 Aura" | Entidade com 2 turnos (M2): no fim de cada turno do dono, +1 Aura no Superkid |
| Pedir Skin | `pedir-skin` | ataque do Superkid (não é carta) | "Ataque de 2 Auras: 1.200 de dano, ela volta pro deck, coloca um Superkid com 1 Aura no campo ativo" | Novo ataque do Superkid: 1.200 de dano; o Superkid volta ao baralho e outro Superkid entra como ativo com 1 Aura (M6) |

### Arquétipo do Italo
| Carta | id | Tipo / raridade | Texto original | Leitura |
|---|---|---|---|---|
| Itallo de Viego 20/0 | `italo-de-viego` | **Resenha** [Raro] | "Quando entra em campo, joga um Enzo Games do deck no campo, virado. Ataque de 2 Auras: 200 de dano e o próximo dano de um aliado consegue atacar o banco" | Resenha (M1) com gatilho de entrada (M6) e um ataque que libera o próximo golpe aliado para o banco |
| Eu vou ir aí na Pedra Mole te matar | `pedra-mole` | **Resenha** [Raro] | "Se você controla um Enzo Games virado e qualquer carta Itallo, desvira o Enzo Games e ele causa +200 de dano nesse turno" | Resenha (M1) com condição; desvira o Enzo e dá +200 |
| PMLDM | `pmldm` | personagem **Lendária** | "Ao entrar, adiciona 2 cartas Itallo do deck à mão. Passiva: dano do Itallo com o PMLDM no banco vai no time inteiro. Ataque 3 Auras: vira Itallo Ezreal 40/0/100 (inafetado no banco e a condições especiais; 1 Aura: 600 em todos; 4 Aura: se mata e mata 2 cartas do rival)" | M3, M5, M6, M7. A forma Ezreal precisa de arte própria (`pmldm-ezreal`) |

### Outras
| Carta | id | Tipo / raridade | Texto original | Leitura |
|---|---|---|---|---|
| Tiago Cássio | `tiago-cassio` | personagem **Épica** | "1 Aura: 13 de dano, rouba toda a Aura de um inimigo por 1 turno (vira ao bater) e devolve depois. 6 Aura: 6.000 de dano direto na vida do jogador. Nunca ataca com Aura roubada" | M4. O golpe de 6 Aura **mata sozinho** (a vida inicial é 6.000): precisa de decisão (ver Dúvidas) |
| Hoje é Quarta-feira | `hoje-e-quarta-feira` | **magia** [Rara] | "Vai pro cemitério; você pode descartar 2 cartas para ir comer macarronada; o oponente pode pôr 1 Aura a mais no próximo turno; quem usou troca um do banco com o ativo" | Tipo novo `magia` (carta de uso único). Leitura em 3 partes, ver Dúvidas |
| Clubexx | `clubexx` | **campo** [Raro] | "1 vez por turno, cada jogador pode tirar 1 Aura de um Superkid dele e pôr em outra carta do banco (não gasta o limite de Aura do turno)" | Campo novo (M4 simples) |
| Pidão do Vape | `pidao-do-vape` | personagem/goon [Raro] | "Rouba 1 Aura de quem emprestou, para si ou para outro do banco. Dano pulmonar: 1ª Aura 200, 2ª 400, 3ª 600..." | M4; contador de Auras roubadas por turno e dano em si crescente |
| Calibra o Smite | `calibra-o-smite` | **magia** [Rara] | "Gasta 2 Auras de personagens seus; o ativo do oponente só dá metade do dano até o fim do próximo turno dele" | M8 |
| São João do B | `sao-joao-do-b` | **campo** ou ajuste do São João do Butico [Comum] | "Cartas com a tag Degustador da Noite, ao voltar pro deck, põem uma energia em outra carta Degustador na base" | M9. Ver Dúvidas: é carta nova ou mudança do São João do Butico? |

## 3. Dúvidas para o Henrique (o que eu assumi na versão 11 e o que trava as cartas novas)

Assumido na versão 11 (diga se estiver errado e eu corrijo):
1. **"Acumular até 3 de Aura, só 2 por carta"** → li como: **3 Auras por turno, no máximo 2 na mesma carta**. Se a ideia era outra
   (por exemplo, guardar Aura sobrando para turnos seguintes), me diga.
2. **"Degustador não vira com o 2º ataque"** → o **Escudo de Parênteses passou a deixar a carta virada** por 1 turno, como o Vírgula-rangue.
3. **Mansão**: "perdem a vida ganha a não ser que isso os tire de jogo" → os goons perdem o HP extra quando ela sai, **mas ficam com 1 de vida em vez de cair**.
   Se a intenção era ao contrário (caem), é só tirar uma linha.
4. **"Notifica se tiver 1 Aura a mais"** → vale para qualquer goon atacando com Aura **maior** que o custo, mesmo no ataque que não gasta Aura. Notifica o ativo do adversário.
5. **Piscina**: cura 400 de cada carta (ativo e banco) a cada turno; ficou bem mais forte, conferir no jogo.

Para fazer as cartas novas:
1. **Tiago Cássio 6 Aura = 6.000 de dano direto** mata o jogador de uma vez (vida inicial 6.000). É isso mesmo? O golpe no jogador com o ativo dele na mesa sofre a proteção de 35%; vale para este?
2. **Hoje é Quarta-feira**: as três partes são um efeito só, ou "descartar 2 para comer macarronada" é opcional e muda o resto?
3. **Itallo de Viego** e **Pedra Mole** são "Resenha": a Resenha fica *embaixo* de um personagem (deitada) ou é uma carta solta de ataque? E "20/0" é nome (como o "0/14/2" do ItaloLOL) ou número?
4. **Mariana / PMLDM / Júlia**: ocupam vaga do banco (3 vagas) ou ficam fora dele?
5. **Raridades** em colchetes acima: confirme ou troque. Lendárias entram na regra "1 cópia por deck".
6. **São João do B**: carta nova ou texto novo do São João do Butico?
7. Anuah (autor da 2ª parte da lista): confirmar os nomes **Pidão do Vape**, **Clubexx** e **Calibra o Smite**.

## 4. Fases

| Fase | O que | Quem |
|---|---|---|
| 0 | Henrique responde as dúvidas acima | Henrique |
| 1 | M9, M3, M8: Mariana, Calibra o Smite, tags, ataque novo do Superkid sem a parte de buscar | Claude (motor) + DeepSeek (testes) |
| 2 | M4/M6/M7: Hanna, Tiago Cássio, Pidão do Vape, Clubexx, PMLDM (sem Ezreal) | Claude |
| 3 | M2/M5: Lavras MG, Júlia, forma Ezreal | Claude |
| 4 | M1 Resenha: Itallo de Viego, Pedra Mole (motor, online, tela) | Claude + Gemini (QA de tela) |
| 5 | Arte (pode ir em paralelo desde a fase 0): ver seção 5 | Codex pela ponte |
| 6 | Entrar nos pacotes (`js/baralho-dados.js`: `numero`, `raridade`, `peso`, `tcg`), decks prontos novos (Superkid, Itallo), simulador (`node tools/tcg-simular.mjs 2000 normal`: 16–22 turnos, quem começa 48–55%, toda carta entre 40% e 60%), `REGRAS_VERSAO`, cache-bust, changelog | Claude + Gemini |

Cada carta nova precisa, no mínimo: `id` + texto em `js/baralho-dados.js`, números em `js/tcg-cartas.js`, arte, teste em
`test/tcg-regras.test.js`, linha no changelog e no `docs/BATALHA-DOS-TORADOS.md`.

## 5. Plano de arte (para a ponte do Codex)

Formato igual ao das cartas que existem: **PNG 1024×1280, sem transparência**, personagem em destaque, recorte seguro no centro-alto
(a carta usa `foco: '50% 30%'`), mesmo estilo de gibi das artes de `assets/Cartas/`. Destino: `assets/Cartas/<id>.png`.
Antes de gerar, o Claude escreve a tarefa em `E:\AI Workshop\Codex\Bridge\tarefas\NN-cartas-novas.md` com o manifesto e roda
`node conferir.cjs`. **Falta de referência é o que trava**: para cada personagem real/amigo, o Henrique manda uma foto ou ficha.

| Arquivo | Personagem | Referência que já existe | Falta |
|---|---|---|---|
| `hanna.png` | Hanna | — | referência (ficha ou foto) |
| `mariana.png` | Mariana | — | referência |
| `julia.png` | Júlia | — | referência |
| `lavras-mg.png` | Lavras MG (entidade: a cidade/lugar) | — | descrição do visual |
| `italo-de-viego.png` | Itallo de Viego 20/0 | `assets/Cartas/italolol.png`, `assets/Personagens/Italolol.png` | estilo "Viego" (fantasia/armadura?) |
| `pedra-mole.png` | Pedra Mole (cena) | `enzo-games.png` + `italolol.png` | descrição da cena |
| `pmldm.png` e `pmldm-ezreal.png` | PMLDM e forma Itallo Ezreal | `italolol.png` | descrição (o que é PMLDM?) |
| `tiago-cassio.png` | Tiago Cássio | — | referência |
| `hoje-e-quarta-feira.png` | cena da quarta-feira com macarronada | `piscina-de-macarronada.png` | descrição |
| `clubexx.png` | campo Clubexx (balada) | `mansao-do-inominavel.png` (estilo de campo) | descrição |
| `pidao-do-vape.png` | Pidão do Vape | — | descrição |
| `calibra-o-smite.png` | Calibra o Smite (magia) | — | descrição |
| `sao-joao-do-b.png` | São João do B | `sao-joao-do-butico.png` | decisão da dúvida 6 |
| Cartilhas "Como jogar" 1 e 2 | refazer com 3 Auras por turno | `assets/Batalha/como-jogar-1.png` e `-2.png` | só pedir (Codex) |

Prompt-base (cada carta troca só a linha do personagem): "Ilustração em estilo de gibi/HQ brasileiro, linhas grossas, cores saturadas,
personagem em plano médio no centro-alto, fundo simples com cor que combine com a raridade (comum cinza, raro azul, épico roxo,
lendário dourado), sem texto, sem moldura, 1024×1280."

## 6. Próximo passo recomendado

Responder as dúvidas 1 a 7 (principalmente o Tiago Cássio e a Resenha) e mandar as referências de arte. Com isso o Claude
começa pela fase 1 e já deixa a tarefa do Codex pronta.
