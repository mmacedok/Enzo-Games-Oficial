# Plano: minigame do Degustador da Noite — "Ronda nos Telhados"

> **Substituído (24/09/2026)** pelo jogo de plataforma "Caçada ao Inominável" (docs/PLANO-CACADA.md).
> O runner continua no código (`js/ronda*.js`), mas o título da página agora abre a Caçada.

Status: **v1 jogável com placeholders** (fases 1 a 4 feitas em 23/09/2026).
Falta a fase 5 (ajuste da sensação jogando) e a 6 (sprites). Easter egg simples; a v1 usa **só retângulos coloridos** no lugar
das artes. Os sprites vêm depois (lista na seção 7).

## 1. O que é o jogo

Um **runner lateral infinito** à noite. O Degustador da Noite corre sozinho
pelos telhados de prédios de alturas diferentes. O jogador faz duas coisas:

- **PULAR**: de prédio em prédio, por cima de buracos e de obstáculos baixos.
- **ATIRAR** com a MP5K laranja: para a frente, quebrando paredes e
  derrubando ameaças que não dá para pular.

A partida acaba na primeira falha: cair num buraco, bater numa parede ou ser
atingido por uma ameaça. Os pontos vêm da distância percorrida mais os bônus
do que ele destruir. O jogo acelera aos poucos.

## 2. Controles

| Ação | PC | Celular |
|---|---|---|
| Pular (segurar = pulo mais alto) | Espaço, ↑ ou W | tocar na **metade esquerda** da tela |
| Atirar | F, J ou clique | tocar na **metade direita** da tela |
| Pausar | P | botão na tela |

Dois detalhes que deixam um runner "gostoso" e justo:
- **Tolerância de pulo**: dá para pular até ~0,1 s depois de sair da beirada.
- **Pulo antecipado**: se apertar pouco antes de pousar, ele pula ao tocar o chão.

## 3. Mundo e desafios (v1)

| Elemento | Placeholder | Como se vence |
|---|---|---|
| **Prédios** (a base) | retângulos roxo-escuro com janelas amarelas desenhadas por código | alturas e larguras sorteadas; um mais alto, outro mais baixo |
| **Buraco** entre prédios | vão vazio | pular |
| **Obstáculo baixo** (caixa d'água, ar-condicionado) | retângulo cinza | pular (não quebra) |
| **Parede quebrável** (tijolo, tábua) | retângulo laranja com barra de vida | atirar (3 tiros); alta demais para pular |
| **Pássaro** | quadrado amarelo, voa ondulando na altura do corpo | pular por baixo/cima ou atirar (1 tiro) |
| **Drone do Inominável** (a partir de ~40 s) | quadrado verde que desce na frente | atirar (2 tiros) |

Bônus (opcional na v1): **vírgulas** flutuando para coletar, a piada
gramatical do Degustador.

### Justiça (regras do gerador de fases)
O gerador nunca cria um trecho impossível:
- Um buraco nunca passa de 85% do alcance máximo do pulo **na velocidade atual**.
- Um prédio nunca sobe mais do que 70% da altura máxima do pulo em relação ao anterior. Descer pode.
- Uma parede quebrável sempre aparece longe o bastante para dar tempo de dar
  os 3 tiros, e nunca logo depois de um pouso.
- Nunca há dois desafios "de pulo" colados; sempre sobra chão para respirar.
- O teste automático prova isso com um robô que joga milhares de trechos.

### Dificuldade
- A velocidade sobe de ~260 para ~520 px/s ao longo de ~90 s e depois estabiliza.
- Buracos, paredes e ameaças ficam mais frequentes com o tempo, sempre dentro das regras acima.

## 4. Tela

- Canvas lógico **640×360 (16:9, deitado)**: o natural para um runner.
- **Celular em pé**: o jogo aparece menor, com o aviso "gire o celular para
  jogar melhor". Em pé continua jogável.
- O Degustador fica fixo a ~25% da tela a partir da esquerda; o mundo passa por ele.
- Fundo de uma **cidade metropolitana à noite**, em tons de roxo e azul-escuro,
  com prédios altos e janelas iluminadas. Duas camadas de cidade em paralaxe.
- **Batsinal do Degustador:** um holofote projetando uma **vírgula** grande e
  reconhecível nas nuvens, em vez de um morcego. O sinal fica no céu, separado
  das camadas de prédios que se repetem, para não aparecer duplicado na rolagem.
- Na v1, o cenário pode ser desenhado por código; as artes de fundo entram
  junto com os sprites, preservando a leitura dos obstáculos e do personagem.
- Interface: distância em metros, pontos, recorde; no fim, quadro de gibi com
  placar e onomatopeia ("CRASH!", "SPLAT!").

## 5. Onde fica

- **Gatilho:** clicar no título "DEGUSTADOR DA NOITE" da página do Degustador.
- Abre na mesma **janela em tela cheia** do Flappy, no tema roxo, com o cursor da MP5K.
  Os arquivos só baixam no primeiro clique.

## 6. Técnica

```
js/game-dialog.js         janela de jogo compartilhada (sai do Flappy)
js/ronda-core.js          regras puras: física, gerador de prédios e desafios,
                          tiros, colisão, pontos, dificuldade (testável no Node)
js/ronda.js               desenho, controles, telas, recorde
test/ronda-core.test.js   contrato + robô que prova que todo trecho é vencível
tools/qa-ronda.js         robô jogando no navegador (roda dentro de tools/qa.mjs)
```

- Mesmo desenho de sucesso do Flappy: física com passo fixo (60 Hz e 144 Hz
  jogam igual), colisão igual ao desenho, pausa ao trocar de aba.
- Hitbox do Degustador um pouco menor que o retângulo (perdoa raspão).
- Sem som na v1.

## 7. Artes para depois (para combinar a geração)

Os sprites de personagens e objetos serão pequenos, em PNG com fundo
transparente, desenhados de lado, olhando para a direita, no estilo do gibi.
O cenário é uma arte separada: céu noturno pode ser opaco; camadas de cidade
e o batsinal de vírgula devem ter transparência ao redor dos elementos.

| Sprite | Quadros | Observação |
|---|---|---|
| Degustador correndo | 4–6 | todos no mesmo tamanho de quadro, pés na mesma linha |
| Degustador pulando / caindo | 2 | subida e queda |
| Degustador atirando (correndo) | 2 | com clarão laranja na MP5K |
| Degustador morrendo | 1 | tropeço ou queda |
| Pássaro | 2 | asa para cima e para baixo |
| Drone do Inominável | 1–2 | |
| Parede quebrável | 3 | inteira, rachada, destroços |
| Obstáculo baixo | 2–3 variações | caixa d'água, ar-condicionado, antena |
| Topo de prédio / fachada | opcional | dá para manter por código |
| Fundo de metrópole noturna | 2 camadas + céu | roxo e azul-escuro; cidade com repetição horizontal contínua para paralaxe |
| Batsinal de vírgula | 1 | projeção luminosa nas nuvens; camada separada para não se repetir com os prédios |

Com isso, são cerca de **10 quadros do Degustador**, como você falou. A troca de
retângulo para sprite fica isolada no `ronda.js` e é uma tarefa boa para o Gemini.

## 8. Fases e quem faz

| Fase | O que | Quem |
|---|---|---|
| 1 | Extrair a janela do Flappy para `js/game-dialog.js` sem mudar o comportamento | **Gemini** (QA do Flappy como prova) |
| 2 | Regras, gerador justo e testes com robô | Claude (é a parte difícil) |
| 3 | Desenho com placeholders, controles, telas, gatilho no título | Claude |
| 4 | Robô de QA no navegador (`tools/qa-ronda.js`) | Claude (saiu junto com o teste da fase 3) |
| 5 | Ajuste da sensação | Claude + Henrique jogando |
| 6 (depois) | Trocar placeholders pelos sprites | **Gemini** (Claude confere) |

Estimativa: cerca de **1,5 a 2 janelas de 5 h do Claude** (é mais que o
Flappy, por causa do gerador de fases) e 2 tarefas do Gemini.

## 9. Decisões com padrão sugerido (é só dizer se quiser diferente)

1. **Uma falha = fim** (igual ao Flappy). Alternativa: 3 corações.
2. **Tiro sem limite**, com cadência (≈ 6 tiros por segundo). Alternativa: munição com recarga.
3. **Tela deitada 16:9**, com aviso para girar o celular.
4. **Vírgulas colecionáveis**: entram na v1 ou ficam para depois?
