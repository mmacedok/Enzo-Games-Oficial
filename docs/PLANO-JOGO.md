# Plano: Flappy Enzo (easter egg)

Status: **plano aprovado, nada implementado**. Revisado em 23/09/2026 com as
decisões do Henrique. As artes estão em `assets/flappy/` e em
`E:\AI Workshop\Enzo Games\Floppy enzo\`.

**Princípio: é um easter egg.** Simples, curto de fazer e fácil de manter.
Na dúvida, fica de fora.

## 1. Decisões (Henrique, 23/09/2026)

| Pergunta | Decisão |
|---|---|
| Onde fica | **Dentro da home**, escondido, abre quando o usuário clica |
| Vidas | **Uma batida acaba o jogo** (igual ao Flappy Bird) |
| Obstáculos | **Garfo dourado desce do alto, faca dourada sobe do chão** |
| Macarronada com auréola | É **o objetivo que o Enzo persegue**: voa sempre à frente dele, fora de alcance |
| Ranking online | **Não** por enquanto (só recorde pessoal no aparelho) |
| Quadros de animação | **O mínimo**: um único desenho do Enzo, animado por código |

## 2. Como o jogo funciona

Igual ao Flappy Bird:
- Clique, toque, espaço ou seta para cima = um impulso para cima. A gravidade puxa para baixo.
- Pares de talheres vêm da direita em ritmo constante, com um vão entre o garfo e a faca.
- +1 ponto por par atravessado. Bateu no talher ou no chão: fim de jogo.
- Telas: "Toque para voar" → jogo → fim de jogo (placar + recorde) → toque para recomeçar.

Tema:
- **Enzo:** `Floppy enzo/flappy enzo.png`. Sem quadros extras: gira o nariz
  para cima ao subir, para baixo ao cair, e dá uma "esticadinha" a cada toque.
- **Macarronada Sagrada:** `Floppy enzo/Flappy enzo trinaglepng.png`, flutuando
  na parte da frente da tela, balançando de leve, sempre um pouco à frente do
  Enzo. Quando ele bate: "A MACARRONADA ESCAPOU!". Só visual, sem colisão.
- **Talheres:** `Floppy enzo/Forks for the retangle.png` recortado em garfo e
  faca. A ponta (dentes ou lâmina) tem tamanho fixo e o cabo se estica até a
  borda da tela.
- **Cenário:** céu em degradê com a retícula de bolinhas do site e o chão
  rolando. Tudo desenhado por código, sem arte nova.
- Textos em português, com onomatopeia de gibi no fim: "CLANG!".

## 3. Onde fica na home

- **Gatilho:** clicar no logo "ENZO GAMES" (o segredo de antes). Uma dica
  discreta, como o rabinho do gato piscando de vez em quando, é opcional.
- Abre por cima da home numa **janela em tela cheia** (`<dialog>`), com o
  jogo no centro e um botão "X". Esc também fecha. Fechar pausa tudo e a
  home continua exatamente como estava.
- Os arquivos do jogo **só são baixados no primeiro clique**. Quem não abre
  o jogo não carrega nada a mais.

Por que assim: é "dentro da home" como pedido, mas sem empurrar o layout nem
arriscar quebrar a estante. É o jeito mais simples e seguro.

## 4. Técnica (enxuta)

```
js/flappy-core.js   regras puras: física, talheres, colisão, pontos (testável no Node)
js/flappy.js        janela, canvas, desenho, controles, recorde
css/style.css       seção pequena para a janela do jogo
tools/prepare-flappy-assets.js   recorta as artes (sharp, uma vez só)
test/flappy-core.test.js
```

- Canvas lógico **360×640** (9:16), escalado para a tela e nítido em celular.
- Física com passo fixo (60 Hz e 144 Hz jogam igual). Valores iniciais:
  gravidade 1500 px/s², impulso −430 px/s, talheres a 150 px/s, vão de 150 px,
  210 px entre pares. O ajuste fino é feito jogando.
- Colisão: círculo um pouco menor que o Enzo contra retângulos iguais aos
  talheres desenhados. Nunca "talher invisível".
- Todo vão novo precisa ser alcançável a partir do anterior.
- Recorde em `localStorage`. Pausa ao trocar de aba.
- **Fora da v1:** som, medalhas, ranking, dificuldade crescente, skins.

## 5. Fases e quem faz

| Fase | O que | Quem |
|---|---|---|
| 1 | Script que recorta Enzo, macarronada, garfo e faca | **Gemini** (Claude confere os recortes vendo as imagens) |
| 2 | Testes das regras (o "contrato") → código das regras até os testes passarem | Claude escreve os testes, **Gemini** implementa, Claude confere |
| 3 | Janela, desenho, controles, integração com o logo | Claude |
| 4 | Ajuste da sensação e conferência final | Claude + Henrique jogando |

Estimativa: cerca de **1 janela de 5 h do Claude** e 2 tarefas do Gemini.

## 6. Pronto quando

- Abre pelo logo, fecha pelo X ou Esc, e a home fica intacta.
- Joga liso no PC e no celular. Uma batida acaba o jogo. Nenhum vão impossível.
- Testes e QA passam, sem erros no console.
- O Henrique jogou e aprovou.
