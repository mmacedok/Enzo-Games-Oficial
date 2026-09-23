# Plano: minigame do Degustador da Noite (easter egg)

Status: **plano, nada implementado**. 23/09/2026.
Mesmo princípio do Flappy Enzo: easter egg **simples**, rápido de jogar e de manter.

## 1. Conceito recomendado: "Faxina no Discord"

O Inominável está falando besteira no Discord de falar besteira. O Degustador
da Noite, com a MP5K laranja, limpa o chat na bala.

- Balões de mensagem estilo Discord pipocam pela tela (sobre o fundo da
  Toradolândia, com monitores e o T-Rex em silhueta).
- **Atire nas besteiras** (clique ou toque): "EU VOU FALAR BESTEIRA",
  "vírgula é opcional", "lasanha > macarronada", "quarta-feira é o melhor dia",
  "faz o L", "67"...
- **Não atire nos aliados:** "macarronada 🍝", "Enzo Games", "Heroes never die"
  (Otis). Acertou aliado: perde pontos e o Degustador grita
  "VOCE TA ME HUMILHANDO" (sem vírgula, como manda o cânone).
- **Stand do Joinha 👍:** de tempos em tempos aparece um joinha; acertar nele
  apaga todas as besteiras da tela de uma vez.
- Partida de **60 segundos**, combo por acertos seguidos, recorde no aparelho.
- Título no fim conforme os pontos: "Estagiário da Toradolândia" →
  "Vigilante de São João do Butico" → "Degustador Supremo".

Por que este: usa o cursor da MP5K que já existe (mira natural), funciona igual
no PC e no celular (tocar = atirar), não precisa de arte nova (os balões e o
cenário são desenhados por código) e as frases carregam o humor da obra.

### Alternativas (se preferir)
- **B. Escudo de Parênteses:** o Inominável atira balas "Blasfêmia" de um
  prédio; você gira um escudo de parênteses em volta do Degustador para
  rebater. Um botão só, mais "jogo de reflexo". Pede mais ajuste de física.
- **C. Fuga no Onix Hatch:** corrida infinita desviando de foguetes do
  Inominável até a Toradolândia. É o mais trabalhoso dos três, porque pede arte
  do carro e do cenário rolando.

## 2. Onde fica

- **Gatilho:** clicar no título metálico "DEGUSTADOR DA NOITE" da página do
  Degustador (o espelho do logo da home, que abre o Flappy).
- Abre na mesma **janela em tela cheia** do Flappy (Fechar ou Esc), com o tema
  roxo. Os arquivos só baixam no primeiro clique.

## 3. Técnica (reaproveita o Flappy)

```
js/degustador-core.js   regras puras: surgimento das mensagens, tempo de vida,
                        acerto, pontos, combo, joinha, relógio (testável no Node)
js/degustador-game.js   janela, canvas, desenho, toque/clique, recorde
js/game-dialog.js       (novo) janela de jogo compartilhada: Flappy e Degustador
data/degustador-frases.json   frases de besteira e de aliados (fácil de editar)
test/degustador-core.test.js
```

- Canvas lógico 360×640 (9:16), igual ao Flappy; nítido no celular.
- As mensagens surgem em posições livres (sem sobrepor), duram de 1,6 a 2,4 s
  e ficam mais frequentes ao longo da partida.
- Acerto = o ponto do clique dentro do balão (a mesma caixa usada no desenho).
- Clarão e "PEW!" no ponto do tiro; o balão estoura em estilo gibi ("POW!").
- Assets existentes: rosto do Degustador (`assets/degustador-face-t.png`) no
  canto, a MP5K como cursor e o logo do Discord desenhado por código.
- **Fora da v1:** som, ranking online, fases, chefão.

## 4. Fases e quem faz

| Fase | O que | Quem |
|---|---|---|
| 0 | Escolher o conceito e aprovar a lista de frases | Henrique |
| 1 | Extrair a janela do Flappy para `js/game-dialog.js` sem mudar o comportamento | **Gemini** (refatoração mecânica, com o QA do Flappy como prova) |
| 2 | Regras + testes | Claude (pequeno demais para valer delegar, lição do Flappy) |
| 3 | Desenho, balões, cenário, efeitos, gatilho no título | Claude |
| 4 | Robô de QA que joga e confere pontos e erros | **Gemini** |
| 5 | Ajuste da diversão e conferência final | Claude + Henrique jogando |

Estimativa: cerca de **1 janela de 5 h do Claude** e 2 tarefas do Gemini.

## 5. Decisões pendentes (Henrique)

1. Conceito: **A (Faxina no Discord, recomendado)**, B ou C?
2. Gatilho: clicar no título "DEGUSTADOR DA NOITE" está bom?
3. Partida de 60 segundos está bom?
4. Frases: eu escrevo uma primeira lista (20 besteiras e 6 aliados) para você
   aprovar, ou você já tem piadas internas que quer usar?
