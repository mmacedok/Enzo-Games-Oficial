# Enzo Games Site

Leitor de HQs do Enzo Games + mini-game **Flappy Enzo** + galeria de personagens.

- **Home** (`index.html`) — hero com o lançamento, grid de edições e o jogo (abra clicando no logo).
- **Leitor** (`reader.html?comic=<id>&chapter=<id>`) — leitura vertical com zoom, censura por senha e easter eggs.
- **Spin-off** (`degustador.html`) — Degustador da Noite, com tema próprio.
- **Personagens** (`personagens.html`) — galeria de fichas com visualização em tela cheia.

## Como rodar

```bash
npm install          # uma vez
npm run build        # gera data/database.json a partir de assets/
npm start            # servidor + vigia de assets
```

Abra <http://localhost:3000>.

| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor e o `watch.js` (reconstrói o catálogo quando algo muda em `assets/`) |
| `npm run serve` | Só o servidor |
| `npm run build` | Só o build do catálogo (`data/database.json`) |
| `npm test` | Testes automatizados (catálogo, física do jogo, API, máscara de imagem) |
| `npm run qa -- --url <url> --out <arquivo.png>` | Screenshot headless + relatório de erros de console/rede |

### Exemplo de verificação visual

```bash
npm run qa -- --url http://localhost:3000/index.html --width 390 --height 844 --mobile --out shots/home-mobile.png
```

## Como jogar

Clique no logo Enzo Games. Use **Espaço**, **seta para cima** ou **toque no canvas**
para voar entre os obstáculos. Você tem três chances, com proteção breve após cada
impacto. A cada cinco pontos o ritmo aumenta, até um limite. **P** ou o botão de
pausa interrompe a partida; voltar de outra aba deixa o jogo pausado.

Após perder, um toque recomeça. Salvar no ranking é opcional, pelo botão
**Salvar placar**. O recorde local e o ranking existentes são preservados.

### Testes de interação

```bash
node tools/qa.mjs --url http://localhost:3000 --eval-file tools/qa-game.js --out shots/game-desktop.png
node tools/qa.mjs --url http://localhost:3000 --mobile --width 390 --height 844 --eval-file tools/qa-game.js --out shots/game-mobile.png
node tools/qa.mjs --url "http://localhost:3000/reader.html?comic=capitulo-1" --eval-file tools/qa-reader.js
```

O teste do jogo simula falha e sucesso do envio sem escrever no ranking real.
O aviso HTTP 503 nessa simulação é esperado. `npm test` cobre 35 casos; veja
[docs/CORRECOES.md](docs/CORRECOES.md) para resultados e limites da verificação.

## Como publicar conteúdo

1. Coloque as imagens em `assets/`:

   ```
   assets/Capitulo 7/Capa/Capa CAP7.png        -> capa (a 1ª imagem da pasta)
   assets/Capitulo 7/Paginas/PAG1.png          -> páginas (ordem natural: PAG2 < PAG10)
   assets/Spin Offs/Meu Spin Off/Capitulo 1/…  -> spin-off completo
   ```

2. Rode `npm run build` (ou apenas salve o arquivo, com o `npm start` rodando).

O build **não apaga** o que foi curado à mão: títulos, descrições, censura e
easter eggs vivem em `data/comics.manifest.json` e são preservados a cada
reconstrução. O build é idempotente — rodar duas vezes não muda o arquivo.

### `data/comics.manifest.json`

| Campo | Para que serve |
|---|---|
| `comics.<id>.title` / `description` | Texto exibido na home e no leitor |
| `comics.<id>.id` | Força o id final (ex.: pasta "Degustador da noite" → id `degustador`) |
| `comics.<id>.order` | Ordem no catálogo (padrão: número do capítulo; spin-offs usam 100+) |
| `censorship.<comicId>[]` | Tarja "CONTEÚDO BANIDO" por `pageIndex`, liberada com a senha |
| `easterEggs[]` | `kind: "macarronada"` (conquista) ou `image` + `box` (imagem secreta) |

Senha da censura: `copodelagrimas`.

## Estrutura

```
atualizar.js              build do catálogo (assets/ + manifest -> database.json)
server.js                 servidor estático + API do ranking
watch.js                  vigia de assets (dispara o build)
lib/cabo-coco-mask.js     gera a máscara transparente do Cabo Côco
js/game-core.js           regras puras do jogo (colisão, física) — testável
js/game.js                motor do Flappy Enzo (canvas, input, ranking)
js/main.js                home (hero + grid)
js/reader.core.js         leitor (único motor de renderização)
js/game.test.js           (removido) — testes agora em test/
css/style.css             estilos do site inteiro
data/comics.manifest.json conteúdo curado (fonte de verdade)
data/database.json        catálogo gerado (não editar à mão)
test/                     testes (npm test)
tools/qa.mjs              harness de screenshot headless
docs/historico/           relatórios antigos de agentes (não refletem o código atual)
```

## Imagens e publicação

`npm run build` gera WebP em até três larguras, registra dimensões e usa nomes com
hash em `assets/web/`. Os originais são preservados. `data/images.json`,
`js/images.generated.js` e `css/images.generated.css` são gerados automaticamente.
Imagens estáticas nos HTMLs mantêm `data-original` para builds futuros. Não edite
arquivos gerados manualmente. Publique o resultado completo do build.

O watcher observa `assets/` e `data/comics.manifest.json`. Mudanças recebidas durante
um build ficam na fila. O servidor publica somente páginas, JS, CSS, assets e
catálogo; arquivos ausentes retornam 404.

Execute `npm run qa:site -- http://localhost:3000` para conferir todas as páginas
em desktop e celular. Resultados ficam em `shots/site-audit/results.json`.

## Notas técnicas

- **Física do jogo**: passo fixo de 1/60 s; roda igual em 60 Hz ou 144 Hz.
- **Canos novos**: sprite de molho e macarrão com boca e corpo recortados pelo canvas.
- **Hitbox = desenho**: `js/game-core.js` é a única fonte dos retângulos usados
  para desenhar e para detectar colisão — não existe "cano invisível".
- **Ranking**: `POST /api/leaderboard` valida tipo, sinal e teto (`MAX_SCORE`,
  padrão 300, configurável por env), sessão assinada, tempo de partida, uso único
  e rate limit por IP. O jogo abre a sessão automaticamente. Para manter sessões
  entre reinícios do servidor, configure `LEADERBOARD_SECRET` no ambiente.
- **Cache**: imagens com `max-age` de 7 dias; HTML sempre revalidado. Não há
  cache-busting por requisição no leitor.
