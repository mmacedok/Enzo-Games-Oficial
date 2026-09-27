# Pesquisa: trocar o Flappy Enzo por um "Vampire Survivors" do Enzo Games

> Escrito em 2026-09-27. Nada do jogo foi feito ainda: isto é o estudo e a proposta.
> Nome provisório: **Enzo Survivors** (troque à vontade; ver "Perguntas" no fim).

## Resumo
- **Dá para fazer, e o jogo não fica pesado para o site.** Ele roda inteiro no navegador de quem
  joga. A Cloudflare só entrega os arquivos uma vez (ficam em cache 7 dias) e recebe **2 chamadas
  de API por partida** (começar e enviar o recorde), igual ao Flappy de hoje.
- **O peso real fica no aparelho do jogador**, porque o gênero põe centenas de inimigos na tela.
  Medi um protótipo em canvas 2D, o mesmo tipo de desenho do Flappy e da Caçada: **1000 inimigos
  na tela levam uns 3 ms por quadro**, e o limite para 60 quadros por segundo é 16,7 ms. Dá conta
  com folga, desde que o código siga as regras da seção 3.
- **Não precisa de biblioteca.** O Vampire Survivors original foi feito em JavaScript com Phaser.
  Ele só trocou para Unity na versão 1.6 (ago/2023), para ir a consoles e celular e rodar mais
  rápido. Aqui seguimos o padrão da casa: regras puras e testadas num arquivo `-core.js` e o
  desenho em outro arquivo.
- **Controle perfeito para celular.** Vampire Survivors só tem "andar", e os ataques são
  automáticos. O analógico virtual da Caçada serve quase sem mudança.

## 1. Hospedagem: a Cloudflare muda alguma coisa?
| O quê | Onde roda | Custo na Cloudflare grátis |
|---|---|---|
| Física, inimigos, tiros, desenho | **no navegador do jogador** | zero |
| Baixar `js/` e artes (~1–3 MB) | arquivos estáticos | ilimitado e grátis; cache de 7 dias em `/assets/*` |
| Ranking: `session/start` + `session/submit` | Worker `/api/*` | 2 de 100 mil requisições por dia; poucos ms de CPU |

Hospedagem melhor não deixa o jogo mais leve nem mais pesado. O que a Cloudflare melhora aqui é a
entrega dos arquivos (CDN perto do jogador, tráfego sem cota) e o fim do risco de o site congelar
por cota, como aconteceu no Netlify. **Nunca** rode a lógica do jogo no servidor. O limite de
10 ms de CPU por chamada e a latência tornariam isso inviável, e não há motivo para isso num jogo
single-player.

## 2. Por que o gênero pesa, e onde
Um Vampire Survivors tem muitas entidades vivas ao mesmo tempo: 300 a 1000 inimigos, dezenas de
projéteis, centenas de gemas de XP no chão e números de dano. O custo por quadro vem de três
lugares:

1. **Colisão.** Se comparar tudo com tudo, 1000 inimigos dão 500 mil pares por quadro, e com as
   armas contra os inimigos isso multiplica. É o que mais trava. A solução é a **grade espacial**
   (seção 3).
2. **Desenho.** Cada `drawImage` custa pouco, mas milhares somam. Isso se resolve com sprites
   pré-cortados e desenho só do que está na tela.
3. **Lixo de memória.** Criar `{x, y}` novo a cada tiro faz o coletor de lixo parar o jogo por
   alguns ms, e isso aparece como "engasgo". A solução é reaproveitar objetos (pool).

### Medição (protótipo no Chromium do servidor, canvas 640×360, sem placa de vídeo)
Cada inimigo anda até o jogador e se afasta dos vizinhos, com 200 tiros por quadro e um sprite de
32 px por inimigo.

| Inimigos | Todos na tela, com grade | Espalhados (metade fora), sem grade | Espalhados, com grade |
|---:|---:|---:|---:|
| 300 | 1,0 ms | 2,3 ms | 0,4 ms |
| 1000 | 3,1 ms | 2,0 ms | 1,1 ms |
| 2000 | 7,0 ms | 6,5 ms | 2,6 ms |
| 4000 | 16,3 ms (no limite) | — | — |

Um celular fraco é umas 3 a 5 vezes mais lento que isso. Por isso o teto seguro é **~500 inimigos
vivos no celular e ~1000 no PC**, com um limite fixo no `CONFIG`. O próprio Vampire Survivors tem
um teto de inimigos na tela. Sem a grade, o custo cresce ao quadrado: com as armas acertando em
área e 1000+ inimigos, passa do limite rápido.

## 3. Regras de desempenho (obrigatórias no código)
1. **Passo fixo** de 1/60 s com acumulador (a Caçada usa 1/120), e no máximo 5 passos por quadro.
   Numa aba lenta o jogo fica mais lento, mas não explode.
2. **Grade espacial** com células de 32–64 px, refeita a cada passo com listas encadeadas em
   `Int32Array` (como no protótipo). Tiro contra inimigo, inimigo contra jogador, separação entre
   inimigos e ímã das gemas: tudo consulta só as células vizinhas.
3. **Pools** para inimigos, projéteis, gemas e números de dano. São listas de tamanho fixo
   criadas no início; "morrer" é marcar `vivo = false`. Nada de `new` nem de `{}` dentro do
   `avancar()`.
4. **Gemas se juntam.** Passando de ~300 no chão, as mais velhas se fundem numa gema grande,
   como o Vampire Survivors faz. Isso limita a memória e o desenho.
5. **Desenho só do que aparece na tela.** Os sprites são pré-cortados em canvas, sem `filter`,
   `shadowBlur` nem gradiente por inimigo. Piscar de dano é um sprite branco pré-gerado, e não um
   `filter` a cada quadro (a Caçada já faz isso com `tingidoLeve`).
6. **Canvas lógico pequeno** (640×360, igual à Caçada), ampliado com
   `image-rendering: pixelated`. O `GameDialog` já faz isso. Não multiplique pelo
   `devicePixelRatio`: 3× no celular é 9 vezes mais pixel para pintar.
7. **Chão em ladrilhos pré-desenhados** num canvas de fundo, com `drawImage` de 1 a 4 pedaços
   por quadro, e não um ladrilho de cada vez.
8. **Pausar quando a aba some** (`visibilitychange`) e quando abre o menu de level up.
9. **Modo "menos efeitos" automático.** Se a média de quadro passar de 14 ms por 2 s, corta as
   partículas e os números de dano.

**Biblioteca?** Não precisa. Se um dia quiser 5000+ inimigos, o caminho é trocar só o desenho
para WebGL (PixiJS, ~500 KB), mantendo o `-core.js` igual. Não recomendo o Phaser inteiro
(~1 MB e outro jeito de organizar o código): o site já tem o padrão dele e ele funciona.

## 4. Como o jogo funciona (o que copiar do gênero)
Mecânicas não têm direito autoral; nomes, artes e músicas têm. Por isso o jogo é "do gênero"
(como Brotato, Halls of Torment, Megabonk), e tudo que aparece na tela é do Enzo Games.

- **Loop:** andar com 8 direções (ou analógico). As armas disparam sozinhas em recarga. Inimigo
  morto solta gema de XP, e cada nível sobe mostrando **3 escolhas** (4 com sorte).
- **Espaços:** até **6 armas** e **6 itens passivos**. Cada arma sobe até o nível 8.
- **Evolução:** arma no nível máximo + o item passivo certo + abrir um baú de chefe dá a arma
  evoluída. É isso que dá o "uau" no meio da partida.
- **Tempo:** a partida dura 15 min (o original tem 30 min, que é longo demais para um easter egg).
  Ondas mudam a cada minuto, e aparece um chefe com baú aos 5, 10 e 15 min. Aos 15:00 vem o
  "Inominável" para acabar a partida, como a Morte do original.
- **Entre partidas:** as moedas da partida compram melhorias permanentes (vida, dano, ímã…) e
  personagens novos. Isso fica salvo no navegador e, com login, na conta
  (`/api/user` já guarda progresso).
- **Pontuação para o ranking:** **tempo sobrevivido em segundos**, com os abates como desempate
  nos metadados. Isso deixa o anti-cheat trivial e à prova de truque: o servidor já mede o tempo
  real da partida (`run_token`), então `pontos ≤ duração`. Se preferir ranking por abates, o teto
  sai do ritmo máximo de nascimento no `CONFIG` (mesma ideia do `tetoFlappy`).

### Pele do Enzo Games (proposta)
| Do gênero | No Enzo Games |
|---|---|
| Personagens | Enzo, Degustador da Noite, Hatsune Neves, Italolol, Superkid, Cabo Côco (secreto). Cada um começa com uma arma e um bônus |
| Armas | talheres (faca/garfo giratórios, vindos do Flappy), vírgulas do Degustador (a "rajada"), macarronada que cai em área, controle de videogame bumerangue, microfone (onda sonora da Hatsune)… |
| Passivos | Lanche (vida), Fita (dano, da Caçada), Cogumelo (vida máxima), Ímã de molho, Tênis (velocidade)… |
| Inimigos | os da Caçada já prontos (capanga, ping, troll, spam, emoji, moderador), em hordas |
| Chefes | Capanga-mor, Opressor, e o Inominável no fim |
| Cenário | Toradolândia (as `assets/areas/*` da Caçada servem de base para o chão) |

Dá para reaproveitar bastante arte da Caçada. O que falta (sprites de horda em 32–48 px, ícones
de arma e passivo, chão ladrilhável) vai num `docs/ASSETS-SOBREVIVENTES.md` no mesmo formato do
`ASSETS-CACADA.md`.

## 5. Como encaixar no site (o que muda no código)
O Flappy hoje abre pelo logo da home (`[data-flappy-trigger]` em `index.html`), carregado sob
demanda por `js/main.js` (`JOGOS.flappy`) dentro do `GameDialog`. A troca:

| Arquivo | Mudança |
|---|---|
| `js/sobreviventes-core.js` (novo) | regras puras: CONFIG, pools, grade, armas, ondas, level up, semente para testes |
| `js/sobreviventes.js` (novo) | desenho, HUD, menu de level up, loja, analógico, teclado (WASD/setas; Esc pausa) |
| `test/sobreviventes-core.test.js` (novo) | contrato das regras (como o `flappy-core.test.js`), incluindo o teto de pontos |
| `js/main.js` | `JOGOS.flappy` → `JOGOS.sobreviventes`, com o mesmo gatilho no logo (o atributo pode virar `data-jogo-trigger`) |
| `api/anti-cheat.js` | novo id `enzo-survivors` com `tetoSobreviventes(segundos) = floor(segundos)` |
| `js/auth-widget.js`, `js/admin.js` | nome do jogo novo nas listas `JOGOS`, recorde local e o texto do convite de login |
| `README.md` | seção do Flappy vira a do jogo novo |
| `arquivo/flappy/` | o Flappy vai para cá, **igual foi feito com a Ronda** (`arquivo/ronda/`), fora do `dist/` |

**Recordes antigos do Flappy:** a sugestão é manter `flappy-enzo` no anti-cheat e no admin só
para leitura, assim o ranking antigo não some do banco, e tirá-lo da tela. Não precisa de
migração no banco: `game_scores` já guarda qualquer `game_id`.

**Login:** o Flappy abre sem login. Sugiro manter assim: sem login joga com recorde local e com
login entra no ranking. A Caçada é que exige login.

**Tamanho do download:** os scripts ficam em ~100–150 KB e as artes em ~1–2 MB, se forem
spritesheets `.webp`. Tudo baixa só no primeiro clique, como hoje, então a home não fica mais
pesada.

## 6. Fases propostas
1. **Núcleo jogável (sem arte):** andar, 3 inimigos, 3 armas, gemas, level up com 3 escolhas,
   timer, morte e ranking por tempo. Com os testes do core e o robô de QA medindo quadros no
   Chromium com 1000 inimigos.
2. **Conteúdo:** 6+6 itens, evoluções, baús, chefes aos 5/10/15 min, 2–3 personagens.
3. **Pele e arte:** a lista de assets, a integração das artes, sons e efeitos.
4. **Meta-progresso:** moedas, loja permanente, desbloqueio de personagens, conquistas no
   `EnzoConta`.
5. **Troca no site:** o Flappy vai para `arquivo/flappy/` e o logo abre o jogo novo. Push só
   quando você pedir.

## Perguntas para o Henrique
1. Nome do jogo: "Enzo Survivors", "Sobreviventes da Toradolândia", outro?
2. O Flappy some de vez (fica guardado em `arquivo/`) ou continua escondido em outro lugar?
3. Ranking por **tempo sobrevivido** (recomendado) ou por **abates**?
4. Abre sem login, como o Flappy (recomendado), ou só com login, como a Caçada?

## Fontes (consultadas em 2026-09-27)
- [Vampire Survivors (Wikipedia)](https://en.wikipedia.org/wiki/Vampire_Survivors): escolhas de 3–4 itens por nível, 6 armas + 6 passivos
- [Vampire Survivors troca Phaser por Unity em 17/08/2023 (GamingOnLinux)](https://www.gamingonlinux.com/2023/07/vampire-survivors-switching-to-new-game-engine-on-august-17/)
- [Modding FAQ: Phaser antes da 1.6, Unity depois](https://gist.github.com/nwfistere/8d325022187395be70d2a81e04c4ff46)
- [Wiki: Evolução](https://vampire.survivors.wiki/w/Evolution), [Armas](https://vampire.survivors.wiki/w/Weapons), [Passivos](https://vampire.survivors.wiki/w/Passive_items)
- `docs/PLANO-CLOUDFLARE.md` (limites da Cloudflare grátis)
