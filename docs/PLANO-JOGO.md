# Plano: Flappy Enzo (refeito do zero)

Status: **plano, nada implementado**. Criado em 23/09/2026. O jogo antigo foi
removido; as artes ficaram em `assets/flappy/` e em
`E:\AI Workshop\Enzo Games\Floppy enzo\`.

## 1. Objetivo

Um jogo **igual ao Flappy Bird** na mecânica e na sensação, com a cara do
universo Enzo Games. Critério de sucesso: quem já jogou Flappy Bird pega o
controle em 2 segundos e sente o mesmo "só mais uma".

O que é igual ao Flappy Bird (não inventar):
- Um toque/clique/espaço = um impulso para cima. Gravidade puxa para baixo.
- Obstáculos em pares (cima e baixo) com um vão, vindo da direita em ritmo fixo.
- **Uma batida = fim de jogo.** Sem vidas. (O jogo antigo tinha 3 vidas; saiu.)
- +1 ponto por par de obstáculos atravessado.
- Telas: "Prepare-se" (com instrução de toque) → jogo → fim de jogo com placar,
  recorde e medalha → recomeçar.
- Dificuldade constante (o Flappy Bird não acelera). Medalhas a cada 10 pontos.

## 2. Tema: como cada peça vira Enzo Games

| Flappy Bird | Flappy Enzo | Arte |
|---|---|---|
| Pássaro | **Enzo alado de boné gamer** | `Floppy enzo/flappy enzo.png` (896×896, com transparência) |
| Canos verdes | **Talheres dourados gigantes**: garfo descendo do alto (dentes para baixo) e faca subindo do chão (lâmina para cima) | `Floppy enzo/Forks for the retangle.png` (1985×2416, os dois lado a lado com muito espaço vazio: precisa recortar) |
| Moeda/nada | **Macarronada Sagrada** (tigela com auréola), coletável opcional (fase 7) | `Floppy enzo/Flappy enzo trinaglepng.png` (= `assets/flappy/target.png`) |
| Cenário | Céu de fim de tarde com retícula de gibi, silhueta da cidade e chão de estacionamento em rolagem | Desenhado por código na 1ª versão |
| "Game Over" | Quadro de gibi com onomatopeia "CLANG!" e o placar | Código |
| Medalhas | Bronze **Almôndega** (10), Prata **Parmesão** (20), Ouro **Macarronada** (30), Platina **Motores a 300%** com o olho de Sans (40) | Código na 1ª versão |

Regras da bíblia respeitadas: tudo em português do Brasil, inclusive as
onomatopeias ("FLAP!", "CLANG!", "NHAM!"); macarronada, nunca lasanha.
Easter egg sugerido: **às quartas-feiras** aparece o aviso "Enzo odeia
quartas-feiras" e o céu fica nublado (só visual, a dificuldade não muda).

### Arte que falta (opcional, gerada por você na IA de imagem)
Tudo tem substituto desenhado por código, então nada disso trava o jogo:
- 2 quadros extras do Enzo (asas para cima e para baixo) para a batida de asa.
  Sem eles, a batida é simulada esticando e achatando o sprite.
- Fundo do cenário (cidade/condomínio do Arco 1) em faixa horizontal que repete.
- Logo "FLAPPY ENZO" no estilo do logo do site.

## 3. Onde o jogo mora no site

**Recomendação: página própria `jogo.html`**, não mais escondida no logo.
- A home não quebra se o jogo quebrar, e o jogo não pesa na home.
- No celular dá para usar a tela inteira (retrato) e o modo tela cheia.
- Entrada pela home: um card "Jogar Flappy Enzo" na seção "Quem faz a
  bagunça" e um item no menu. O clique no logo pode continuar como segredo
  que leva a `jogo.html`.

## 4. Arquitetura técnica

Mesmo padrão do site: HTML/CSS/JS puro, sem framework e sem build de JS.

```
jogo.html
js/flappy/core.js    regras puras: física, obstáculos, colisão, placar, estados
                     (sem DOM; roda no Node para os testes, como js/shelf.js)
js/flappy/render.js  desenho no canvas: cenário, Enzo, talheres, telas, medalhas
js/flappy/input.js   toque, clique, espaço, seta para cima, P/Esc para pausar
js/flappy/audio.js   efeitos sonoros sintetizados (Web Audio), botão de mudo
js/flappy/main.js    liga tudo: laço do jogo, carregamento, pausa, redimensionar
css/style.css        seção "jogo" (moldura, botões), com os tokens existentes
tools/prepare-flappy-assets.js   recorta e otimiza as artes (sharp)
test/flappy-core.test.js         testes da parte pura
tools/qa-flappy.js               robô que joga no navegador headless
```

### Tela e escala
- Resolução lógica **360×640** (9:16, a mesma proporção das páginas do gibi),
  escalada para caber na tela com bordas (letterbox). Canvas multiplicado pelo
  `devicePixelRatio` para não borrar em celular e em telas retina.

### Laço do jogo
- Passo fixo de física de 1/120 s com acumulador (60 Hz e 144 Hz jogam
  igual), desenho interpolado entre passos para ficar suave.
- Estados: `CARREGANDO → PREPARE-SE → JOGANDO → MORRENDO → FIM → PREPARE-SE`.
  Em `MORRENDO` o Enzo cai até o chão (como no original) antes do placar.
- Pausa automática ao trocar de aba; `P` ou botão para pausar.

### Física (ponto de partida; ajuste fino na fase 6)
Em unidades lógicas (360×640):

| Parâmetro | Valor inicial |
|---|---|
| Gravidade | 1500 px/s² |
| Impulso do toque | −430 px/s (substitui a velocidade, não soma) |
| Queda máxima | 620 px/s |
| Velocidade dos talheres | 150 px/s |
| Vão entre garfo e faca | 150 px |
| Distância entre pares | 210 px |
| Mudança máxima de altura do vão entre pares | 120 px (garante que o vão seguinte é alcançável) |
| Rotação do Enzo | −25° ao subir; gira até +90° (bico para baixo) ao cair |

### Colisão
- Enzo: círculo um pouco menor que o desenho (perdoa encostar na pontinha).
- Talheres: retângulos da **mesma geometria usada no desenho** (lição do jogo
  antigo: nunca ter "cano invisível"). Dentes do garfo e ponta da faca contam.
- Chão mata; o teto não mata, mas os talheres continuam acima da tela, então
  não dá para passar por cima (igual ao original).

### Desenho dos talheres (o ponto mais delicado da arte)
Os talheres têm comprimento fixo na arte, mas cada obstáculo precisa de altura
diferente. Solução: recortar cada talher em **ponta** (dentes/lâmina, tamanho
fixo) e **cabo** (faixa que pode esticar ou repetir). O garfo é desenhado de
cabeça para baixo a partir do topo; a faca de pé a partir do chão.

### Artes (pipeline)
`tools/prepare-flappy-assets.js` com `sharp` (já instalado):
- corta o espaço transparente em volta de cada imagem;
- separa garfo e faca da imagem dos talheres e corta cada um em ponta + cabo;
- gera versões 2× da resolução lógica em PNG/WebP em `assets/flappy/web/`;
- grava `assets/flappy/sprites.json` com tamanhos e caixas de colisão.

### Som
Efeitos sintetizados com Web Audio (bater de asa, ponto, CLANG, queda): sem
arquivos e sem direitos autorais. Começa mudo até o primeiro toque (regra
dos navegadores). O botão de mudo fica salvo.

### Recorde e ranking
- Recorde pessoal em `localStorage`.
- **Ranking online fica para a fase 7.** Precisa de hospedagem com banco de
  dados (o arquivo JSON do jogo antigo não funciona em hospedagem comum) e
  sempre terá trapaça possível, porque o jogo roda no navegador.

### Acessibilidade e celular
- Espaço, seta para cima, clique e toque. `touch-action: none` no canvas
  (sem zoom por toque duplo).
- Com "reduzir movimento" ativado: sem tremida de tela e sem flashes.
- Botão de tela cheia no celular.

## 5. Testes e verificação

- `test/flappy-core.test.js` (Node): mesma física em 60 e 144 Hz; o ponto
  conta uma vez por par; colisão bate com o desenho; todo vão gerado fica
  dentro da tela e alcançável a partir do anterior; batida no chão termina o
  jogo; recomeçar zera tudo.
- `tools/qa-flappy.js` (navegador headless): robô joga 60 s, confere que o
  placar sobe, que batida leva ao fim de jogo, pausa ao trocar de aba, sem
  erros no console, desktop e celular.
- Teste de sensação: **você** joga no celular e no PC antes de publicar.
  Física boa só se valida jogando.

## 6. Fases e quem faz

"Gemini" = tarefa na `Bridge`, com Claude conferindo o resultado sempre.

| Fase | O que | Quem | Por quê |
|---|---|---|---|
| 0 | Decisões da seção 7 | Henrique | São escolhas de produto |
| 1 | `prepare-flappy-assets.js`: recortes e sprites.json | **Gemini** (Claude confere os recortes visualmente) | Trabalho mecânico com sharp e medidas bem definidas |
| 2a | Especificar a API do `core.js` e escrever os testes | Claude | Os testes são o contrato; aqui mora a lógica sutil |
| 2b | Implementar `core.js` até todos os testes passarem | **Gemini** | Com testes prontos, o "certo" é objetivo e verificável |
| 3 | `render.js`, telas, medalhas, cenário, animações | Claude | Julgamento visual e sensação de jogo |
| 4 | `audio.js` com os efeitos | **Gemini** | Tarefa isolada, fácil de especificar |
| 5 | `jogo.html`, card na home, item no menu, README | **Gemini** | Encaixe mecânico seguindo o padrão das outras páginas |
| 6 | Ajuste fino da física, QA com robô, conferência final | Claude + Henrique jogando | Precisa de julgamento e de gente jogando |
| 7 | Opcionais: Macarronada Sagrada, skins (Otis, Degustador), ranking online | Depois | Fora do escopo do "igual ao Flappy Bird" |

Estimativa (plano Pro): fases 1–6 somam cerca de **2 a 3 janelas de 5 h do
Claude** (principalmente as fases 2a, 3 e 6) e 4 tarefas do Gemini. Sem o
Gemini, seriam cerca de 4 janelas.

## 7. Decisões pendentes (Henrique)

1. **Página própria `jogo.html`** (recomendado) ou continuar dentro da home?
2. **Uma batida = fim** (fiel ao Flappy Bird, recomendado) ou manter vidas?
3. **Garfo em cima e faca embaixo** é a leitura certa da imagem dos talheres?
4. A **Macarronada Sagrada** entra já (ex.: vale +5 pontos) ou só na fase 7?
5. **Ranking online**: sim ou não, e quando?
6. Vai gerar os quadros extras de asa do Enzo, ou fica com a animação simulada?

## 8. Pronto quando

- Joga igual a um Flappy Bird em PC e celular, sem travar, 60 fps estável.
- Hitbox confere com o desenho; nenhum vão impossível.
- Todos os testes e o QA com robô passam; zero erro no console.
- Você jogou e aprovou a sensação.
