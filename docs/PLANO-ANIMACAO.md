# Plano: animação "Da macarronada à Toradolândia"

Status: **v1 pronta** (animacao/abertura.html). Parte 1 de uma série (máx. 100 s; esta parte ~45 s).
Referência de estilo: vídeo de DreW no X (zoom infinito, 32 s, 1920×1080).

## 1. Regras do Henrique
- **Tudo em código**: um arquivo HTML + JavaScript puro (Canvas 2D). Nenhuma biblioteca,
  nenhuma imagem, nenhuma ferramenta externa. Abre com dois cliques (`file://`), sem servidor.
- Parecer "pelo menos um pouco" com a referência.

## 2. O que copiar da referência
| Na referência | Como fazemos |
|---|---|
| Câmera que **nunca corta**: um detalhe cresce e vira a próxima cena | Uma câmera só, com zoom em escala logarítmica; cada cena vive "dentro" de um ponto da anterior |
| Traço de **lápis tremido** (a linha "ferve" ~8 vezes por segundo) | Linhas desenhadas com pequenos desvios aleatórios, re-sorteados a cada 1/8 s |
| **Papel** claro com granulado no começo | Textura de papel gerada por código uma vez (pontinhos e fibras) |
| Cada escala tem **paleta própria** (papel → escuro → pêssego → espaço) | Cada cena define fundo e cores; a troca de paleta acontece durante o zoom |
| Personagem simples, formas chapadas, contorno fino | Enzo e Degustador desenhados com formas básicas (sem detalhes finos) |

## 3. Roteiro (≈ 45 s)
| Tempo | Cena | O que acontece | Paleta |
|---|---|---|---|
| 0–6 s | **Mesa do Enzo** | Papel. Enzo (gato laranja) diante de um prato de macarronada; espeta uma almôndega com o garfo e levanta | papel creme, laranja, vermelho do molho |
| 6–12 s | **Zoom na almôndega** | A câmera avança até a almôndega ocupar a tela; a textura dela fica "rugosa" | marrom, vermelho |
| 12–18 s | **Almôndega → planeta** | Fundo escurece em estrelas; as manchas da almôndega viram crateras e continentes; o molho vira oceano/atmosfera avermelhada; o planeta gira devagar | espaço roxo-escuro, planeta marrom-avermelhado |
| 18–28 s | **Mergulho no planeta** | Zoom num ponto do planeta: nuvens passam pela câmera, aparece o contorno de uma cidade à noite | azul-noite, roxo |
| 28–42 s | **Toradolândia** | Cidade com janelas acesas; holofote projeta o **batsinal da vírgula** nas nuvens; o **Degustador da Noite** em pé no telhado, capa balançando | roxo e azul-escuro, amarelo das janelas, lavanda do sinal |
| 42–45 s | **Fim** | Câmera para; letreiro simples "Degustador da Noite" desenhado a lápis; fade | — |

## 4. Técnica
```
animacao/abertura.html   um arquivo: canvas 1920×1080 (escala para a tela), estilos mínimos
animacao/abertura.js     motor + cenas (se ficar grande, separa em cenas/*.js, ainda sem build)
```
- **Motor** (Claude): relógio da timeline (`t` em segundos), câmera `{x, y, zoom}` com
  interpolação suave (easing) entre marcos do roteiro, desenho de cada cena na escala certa,
  papel gerado, linha tremida (`linhaLapis(pontos)`), cor que troca entre paletas.
- **Controles de teste**: espaço pausa, ← → voltam/avançam 1 s, barra com o tempo; `?t=20` abre no segundo 20.
- **Gravar vídeo** (depois): botão que grava o canvas com `MediaRecorder` (API do navegador,
  não é biblioteca) e baixa um `.webm` para postar.
- 60 fps em PC comum; tudo determinístico (mesma semente = mesmo desenho), para o vídeo sair igual toda vez.

## 5. Fases e quem faz
| Fase | O que | Quem |
|---|---|---|
| 1 | Motor: timeline, câmera, papel, linha de lápis, controles de teste | Claude |
| 2 | Cena 1 (mesa do Enzo + garfo + almôndega) — vira o **modelo de estilo** | Claude |
| 3 | Cenas 3–5 (planeta, nuvens, cidade, batsinal, Degustador) seguindo o modelo | **Gemini** (uma cena por tarefa, com os helpers do motor) |
| 4 | Costura das transições e ritmo (a parte "mágica" do zoom) | Claude |
| 5 | Ajuste fino assistindo com o Henrique; depois o botão de gravar | Claude + Henrique |

## 6. Decisões com padrão sugerido
1. **Duração**: ~45 s nesta parte (cabe folga até 100 s para as próximas).
2. **Formato**: 16:9 (1920×1080), para postar no X/YouTube.
3. **Som**: nenhum nesta versão.
4. **Onde fica**: `comic-reader/animacao/`, fora do site por enquanto (dá para virar abertura do site depois).
5. **Texto final**: "Degustador da Noite" no fim; sem outros textos.
