# Caçada ao Inominável — metroidvania do Degustador da Noite

Status: **v2 jogável com artes temporárias** (25/09/2026). Inspirado em Hollow Knight e
Silksong (pesquisa em `docs/PESQUISA-HOLLOW-KNIGHT.md`). Abre ao clicar no título da página do
Degustador. A v1 (6 fases soltas, estilo Super Meat Boy) virou o mundo de salas abaixo.

## O que é
Um mundo só, a **Toradolândia**, feito de **15 salas ligadas** em **5 áreas**. O Degustador
explora, luta com a coronhada da MP5K, ganha **habilidades que abrem caminhos novos**, senta em
**bancos** para salvar e caça o Inominável até o covil dele. Quem morre deixa uma **Sombra** com
as vírgulas no lugar da queda.

## Controles
Dois esquemas de teclado; troque em **CONTROLES** na tela inicial ou na pausa (fica salvo).

| Ação | Padrão (WASD) | Hollow Knight (opcional) | Celular |
|---|---|---|---|
| Andar / mirar | W A S D (ou setas) | ← → ↑ ↓ | direcional (com diagonais ◤◥◣◢) |
| Pular (segurar = mais alto) | Espaço | Z | PULAR |
| Coronhada em 8 direções (↓ no ar quica, ↓ no chão é rasteira) | E | X | GOLPE |
| Dash (Capa Janky) | C (ou Shift) | C | DASH |
| Rajada da MP5K | F | A (toque) ou F | RAJADA |
| Degustar (cura) | segure Q | segure A | CURA |
| Sentar no banco / comprar / falar | W perto | ↑ perto | ▲ |
| Mapa rápido (enquanto segura) | Tab | Tab | MAPA |
| Pausa | Esc | Esc | II |
| Confirmar nos menus | Espaço, Enter ou E | Z, Espaço ou Enter | PULAR / GOLPE |

As placas e as dicas mostram as teclas do esquema escolhido (no celular, os nomes dos botões).

## Regras principais
- **Vida:** 5 cogumelos (até 9; 4 fragmentos = +1). Encostar em inimigo tira 1, empurra e dá
  1,2 s de invencibilidade. Espinho e serra tiram 1 e devolvem ao último lugar seguro.
- **Pontuação** (a alma de HK): +11 por golpe que acerta, até 99. **Degustar** gasta 33 e cura 1
  cogumelo (segurando a tecla de cura ~1 s, parado no chão). A **Rajada** gasta 33.
- **Coronhada em 8 direções:** frente, cima, baixo e as quatro diagonais (segure as setas ao
  golpear). Para baixo no chão vira uma rasteira na altura dos pés.
- **Parede (Luvas de Fita), igual à Garra de Louva-a-Deus:** no ar, encoste na parede segurando
  para o lado dela e ele gruda; depois fica grudado sem segurar, deslizando devagar. Segurar para
  fora solta. O pulo da parede empurra pouco para fora: segurando de volta, ele gruda de novo na
  **mesma** parede, mais alto — dá para escalar uma parede só.
- **Pogo:** golpe para baixo (ou diagonal para baixo) no ar em inimigo, espinho, serra ou parede rachada faz quicar e
  renova o dash e o pulo duplo.
- **Morte:** renasce no último banco com vida cheia; as vírgulas ficam com a **Sombra**, que
  aparece onde você caiu; derrote-a para pegar de volta.
- **Bancos:** curam, salvam e fazem os inimigos voltarem.
- **Segredos:** paredes rachadas quebram com 3 golpes e revelam salas escondidas; alavancas abrem
  portões (atalhos).
- **Loja do ItaloLOL** (na Praça): Fragmento de Cogumelo, Lanche Turbinado (cura mais rápida),
  Fita Reforçada (coronhada tira o dobro).

## Mundo e progressão
| Área | Salas | O que tem |
|---|---|---|
| Telhados da Toradolândia | Esconderijo (início, banco), Telhados do Leste, Praça da Vírgula (loja), Torre da Antena | **Rajada da MP5K** no topo da antena; segredo atrás de parede rachada |
| Beco das Chaminés | Chaminé do Beco, Beco (banco), Arena | chefe **Capanga-Mor** → **Capa Janky** (dash); vão que só se passa com dash |
| Fábrica do Chat | Esteira de Memes, Fábrica (banco), Poço | serras, plataformas, mola; **Luvas de Fita** no fundo do poço |
| Torre dos Servidores | Chaminé da Torre, Torre (banco, portão/atalho para a Antena), Sala dos Parênteses | chaminés de pulo de parede; **Parênteses** (pulo duplo) |
| Covil do Inominável | Telhado Alto (banco), Covil | vão que só se passa com pulo duplo; chefe final **O Opressor do Chat** |

**Inimigos:** Capanga (anda), Ping (persegue voando), Emoji Raivoso (quica), Drone (atira em
leque de longe), Troll (investida), Spam Saltitante (pula em você), Bug (anda pelas paredes e
teto), Moderador (escudo; bata por cima ou por trás), Feiticeira (teleporta e lança magia
teleguiada), Sombra.

**Chefes:** Capanga-Mor (salto com ondas de choque, investida que derruba entulho, marretada) e
O Opressor do Chat (punho de joinha, Grito de Fossa com palavras voando — pule as de baixo, fique
no chão nas de cima —, rajadas de glitch e Pings invocados). Os dois ficam mais rápidos com
metade da vida.

## Arquivos
```
js/cacada-core.js         física, combate, mundo, save (testável no Node)
js/cacada-inimigos.js     comportamento de cada inimigo e dos chefes
js/cacada-mundo.js        as 15 salas em texto (legenda no topo do arquivo)
js/cacada.js              desenho, HUD, mapa, telas, controles, save no navegador
tools/cacada-robo.js      robô que atravessa o mundo com a mesma física
test/cacada-core.test.js  contrato das regras (27 testes)
test/cacada-robo.test.js  progressão (5 etapas) e travas de habilidade
docs/ASSETS-CACADA.md     lista de todas as artes para a IA desenhar
```

O robô prova duas coisas: (1) cada etapa (início → Rajada → chefe → Luvas → Parênteses → chefe
final) dá para fazer só com as habilidades que o jogador já tem; (2) sem a habilidade certa, os
três portões (vão do dash, chaminé das Luvas, vão do pulo duplo) **não** passam. A parte (2)
demora alguns minutos: `CACADA_BLOQUEIOS=1 node --test test/cacada-robo.test.js`.

O save fica no navegador (`localStorage`, chave `cacada-save-v2`).

## Próximos passos
1. Henrique jogar e ajustar a sensação (valores em `CONFIG`, no topo de `js/cacada-core.js`).
2. Artes definitivas (`docs/ASSETS-CACADA.md`).
3. Sons e música.
4. Mais áreas, amuletos (os "charms" de HK) e chefes; ranking de tempo.
