# Enzo Games Site

Leitor de HQs do Enzo Games + galeria de personagens. (O mini-game Flappy Enzo foi removido
para ser refeito do zero; as artes dele continuam em `assets/flappy/` e na pasta `Floppy enzo`.)

- **Home** (`index.html`) — destaque do último capítulo e estante 3D com a série principal.
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
| `npm test` | Testes automatizados (catálogo, estante, servidor, máscara de imagem) |
| `npm run qa -- --url <url> --out <arquivo.png>` | Screenshot headless + relatório de erros de console/rede |

### Exemplo de verificação visual

```bash
npm run qa -- --url http://localhost:3000/index.html --width 390 --height 844 --mobile --out shots/home-mobile.png
```

## Testes de interação

```bash
node tools/qa-all.mjs http://localhost:3000
node tools/qa.mjs --url "http://localhost:3000/reader.html?comic=capitulo-1" --eval-file tools/qa-reader.js
```

O primeiro confere todas as páginas em desktop e celular; o segundo, histórico e
zoom do leitor. Veja [docs/CORRECOES.md](docs/CORRECOES.md) para detalhes.

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
server.js                 servidor estático
watch.js                  vigia de assets (dispara o build)
lib/cabo-coco-mask.js     gera a máscara transparente do Cabo Côco
js/main.js                home (hero + grid)
js/reader.core.js         leitor (único motor de renderização)
css/style.css             estilos do site inteiro
data/comics.manifest.json conteúdo curado (fonte de verdade)
data/database.json        catálogo gerado (não editar à mão)
test/                     testes (npm test)
tools/qa.mjs              harness de screenshot headless
docs/CORRECOES.md         registro das correções e da verificação
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

- **Cache**: imagens com `max-age` de 7 dias; HTML sempre revalidado. Não há
  cache-busting por requisição no leitor.

## Design

Todo o visual vive em `css/style.css`, organizado por seções e guiado pelos
tokens do `:root` (cores, fontes, contornos e sombras "de gibi"). Não use
estilo inline nem `<style>` nas páginas; crie uma classe no CSS. Fontes:
Bangers (títulos), Comic Neue (texto) e Luckiest Guy (só o logo). Botões usam
`.btn` e variações (`.btn--purple`, `.btn--danger`, `.btn--muted`, `.btn--small`).

Os títulos exibidos na home vêm de `data/comics.manifest.json`: `title`
("Capítulo 3") vira a etiqueta e `description` ("Mistério do Estacionamento")
vira o título grande. Gibis com `featured: false` (spin-offs) **não aparecem na
home**: ficam só nas páginas próprias (ex.: Degustador, via "Quem faz a bagunça"),
e o leitor navega apenas dentro da mesma coleção.

### Estante 3D (`js/shelf.js`)

As edições da home ficam numa estante: cada gibi é um livro 3D do mesmo
tamanho (capa recortada em 9:16, não importa a imagem original), com lombada,
miolo e brilho holográfico que segue o mouse. O número de gibis por prateleira
é calculado pela largura da tela (6 no desktop largo, 3 no celular) e novas
prateleiras surgem sozinhas: para publicar o capítulo 7, 18 ou 60, basta criar
a pasta em `assets/` e rodar o build. Tamanhos ficam em variáveis no `.bookcase`
do CSS (`--book-w`, `--shelf-gap`).

Páginas deitadas (mais largas que altas) ganham no leitor o botão **Ampliar**,
que abre a página em tela cheia com rolagem lateral — essencial no celular.
Mesmo assim, prefira gerar páginas no formato vertical 9:16.
