# Caçada ao Inominável — jogo de plataforma do Degustador da Noite

Status: **v1 jogável com artes temporárias** (24/09/2026). Substitui o runner "Degustação
Noturna" (docs/PLANO-JOGO-DEGUSTADOR.md) no clique do título da página do Degustador.

## O que é
Jogo de plataforma 2D com **fases feitas à mão**, no estilo Super Meat Boy / Mario / Sonic e
dos jogos de Flash antigos: o Degustador atravessa cada fase fazendo parkour, desviando de
armadilhas e inimigos, até chegar no **Inominável**. Nas fases 1 a 5 o Inominável foge para a
próxima; na 1-6 o Degustador finalmente o pega.

## Movimentos
| Movimento | Como |
|---|---|
| Correr | ← → (ou A D) |
| Pular (segurar = mais alto) | Espaço, Z, K, ↑ ou W |
| Deslizar na parede | no ar, empurrar contra a parede |
| Pular da parede | encostado na parede, apertar pular |
| Agarrar a beirada | no ar, empurrar na direção de uma quina; ↑ ou pular sobe, ↓ solta, pular para o outro lado salta |
| Descer da marquise | ↓ |
| Atirar (MP5K) | F, J ou X |
| Pisão | cair em cima do inimigo |
| Recomeçar a fase / pausar | R / P |

Ajudas de "sensação boa": tolerância de beirada (coiote), pulo antecipado, passo de física
fixo (60 Hz e 144 Hz jogam igual), renascer em 0,5 s no último ponto de controle.

## Fases (Mundo 1: Toradolândia)
| Fase | Nome | Ensina |
|---|---|---|
| 1-1 | Telhados da Toradolândia | correr, pular, buracos, marquises, espinhos |
| 1-2 | Beco das Chaminés | deslizar e pular de parede em parede |
| 1-3 | Beirais | agarrar a quina, telhas que desabam, mola |
| 1-4 | Patrulha Noturna | inimigos: pisão e tiro |
| 1-5 | Serraria | serras paradas e andando, plataformas móveis |
| 1-6 | O Covil do Inominável | tudo junto |

Cada fase tem vírgulas para coletar (★ quando pega todas) e cronômetro com recorde. O progresso
(fases liberadas, recordes e vírgulas) fica no navegador (`localStorage`, chave `cacada-progresso`).

## Arquivos
```
js/cacada-core.js         regras puras: física, fases, perigos, inimigos (testável no Node)
js/cacada-fases.js        as fases desenhadas em texto (uma letra por tile; legenda no topo)
js/cacada.js              desenho, controles, menu, telas, progresso
tools/cacada-robo.js      robô que acha um caminho em cada fase (prova que dá para passar)
test/cacada-core.test.js  contrato da física + robô em todas as fases
docs/ASSETS-CACADA.md     lista de todas as artes para a IA desenhar
```

Para criar/editar fase: edite o texto em `js/cacada-fases.js` e rode
`node tools/cacada-robo.js 1-3` (ou sem argumento para todas). O robô ignora inimigos (dá para
pisar/atirar), mas respeita espinhos, serras, plataformas, molas e telhas.

## Próximos passos
1. Henrique jogar e ajustar a sensação (velocidade, altura do pulo, janela de agarrar em `CONFIG`).
2. Artes definitivas (docs/ASSETS-CACADA.md) e troca no `js/cacada.js`.
3. Ranking: hoje não envia placar. Dá para ligar um ranking por fase (menor tempo) depois.
4. Mais mundos (fases novas são só texto).
5. Sons.
