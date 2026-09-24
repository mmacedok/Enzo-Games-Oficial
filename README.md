# Enzo Games Site

Leitor de HQs do Enzo Games + galeria de personagens + o easter egg **Flappy Enzo**
(clique no logo da home).

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

## Publicar (GitHub + Netlify)

- `npm run build:deploy` atualiza o catálogo e monta `dist/` só com o que é público
  (páginas `.html`, `css/`, `js/`, `assets/`, `data/database.json` e `data/images.json`).
- `netlify.toml` manda o Netlify rodar esse comando e publicar `dist/`.
- Sem GitHub: rode `npm run build:deploy` e arraste a pasta `dist/` no painel do Netlify (Deploys).
- Com GitHub: cada push na `main` dispara o CI (`.github/workflows/ci.yml`: build + testes)
  e, com o site ligado ao repositório no Netlify, um deploy novo.
- Ficam fora do git: `node_modules/`, `dist/`, `output/`, `shots/` e o catálogo gerado.

## Conta Google, recordes e ranking

Login com Google (botão **🔑 Entrar** no topo das páginas), ranking global do
Flappy Enzo e da Degustação Noturna, conquistas e "continuar de onde parou" no
leitor. Plano completo: [docs/PLANO-OAUTH-SCORES.md](docs/PLANO-OAUTH-SCORES.md).

- `api/` — a API inteira (rotas `/api/*`). Recebe `Request` e devolve `Response`:
  o `server.js` usa localmente e `netlify/functions/api.mjs` usa no Netlify.
- Banco: Postgres. No computador é o PGlite (em `data/local-db/`, fora do git;
  nada para instalar). No Netlify é o Netlify DB (Neon).
- Sessão: cookie `sid` HttpOnly/SameSite=Lax; o banco guarda só o HMAC do token.
- Anti-cheat: cada partida pede um `run_token` ao começar; no fim, o servidor
  compara os pontos com o máximo possível naquele tempo, calculado com as
  regras de `js/flappy-core.js` e `js/ronda-core.js` (`api/anti-cheat.js`).
- Convidado continua jogando com recorde local. No primeiro login os recordes
  locais viram "recorde pessoal" da conta (não entram no ranking, porque não
  dá para provar que foram jogados).
- Sem `GOOGLE_CLIENT_ID`/`SESSION_SECRET` o botão Entrar não aparece e o site
  funciona como antes.

### Conquistas

A aba **Conquistas** fica no balão da conta (clique no seu nome). A lista é
única, em `js/conquistas.js`, e o servidor só aceita ids de lá:

| Conquista | Como libera |
|---|---|
| Leitor da Saga | Ler até a última página todas as edições da série principal |
| Vigília Completa | Ler até a última página todas as edições do Degustador da Noite |
| Caçador de Macarronada | Achar a macarronada escondida |
| Acesso Confidencial | Descobrir a senha do conteúdo banido (libera o Cabo Côco para sempre) |
| Enzo secreto 1–99 | Colecionáveis: clicar num Enzo escondido nas páginas |

As de coleção contam o catálogo na hora: se sair o capítulo 8, quem ainda não
tem a conquista precisa ler o 8 também (quem já tem, continua tendo).

**Esconder um Enzo secreto:** acrescente em `easterEggs` do
`data/comics.manifest.json` (um número de 1 a 99 para cada, sem repetir) e rode
`npm run build`:

```json
{ "comicId": "capitulo-2", "pageIndex": 4, "kind": "enzo-secreto", "numero": 1,
  "box": { "left": "62%", "top": "18%", "width": "9%", "height": "7%" } }
```

`pageIndex` começa em 0 (sem contar a capa); `chapterId` é opcional (spin-offs
com vários capítulos, ex. `"chapterId": "2"` no Degustador). A área é invisível
e brilha ao ser clicada. Convidado também coleciona; sobe para a conta no login.

### Ficha do Leitor e Leitores do site

Clicar no seu medalhão abre a **Ficha do Leitor** (`js/auth-widget.js`), com duas abas:

- **Minha ficha**: a fala do balão é editável ("Mudar fala": até 80 letras, sem
  links) e fica salva na conta (`POST /api/user/profile`). Todo mundo vê.
- **Leitores do site**: todos os leitores (`GET /api/readers`); clicar abre a
  ficha pública (`GET /api/readers/:id`): fala, conquistas, Enzos secretos e
  recordes do placar. Os nomes no Placar global também abrem a ficha.

Público: nome abreviado ("Henrique M."), foto do Google, número de leitor
(ordem de chegada), fala, conquistas e recordes verificados. E-mail e progresso
de leitura ficam privados.

### Configurar no computador

1. Copie `.env.example` para `.env` e preencha `GOOGLE_CLIENT_ID` e
   `SESSION_SECRET` (o próprio arquivo mostra como gerar a chave).
2. No Google Cloud Console, no ID do cliente OAuth (Aplicativo da Web), coloque
   `http://localhost:3000` em **Origens JavaScript autorizadas**.
3. `npm start`.

O login usa o Google Identity Services (ID Token): **o client secret não é
usado** e não precisa ir para lugar nenhum.

### Configurar no Netlify

1. `netlify link` e `netlify db init` (escolha **Direct SQL**): instala o\n   `@netlify/database`; o banco (`NETLIFY_DB_URL`) é criado no próximo deploy.\n   O código usa `api/db-netlify.js`; `NETLIFY_DATABASE_URL` (Neon) também serve.
2. Em Site configuration → Environment variables: `GOOGLE_CLIENT_ID` e
   `SESSION_SECRET` (outra chave, diferente da local).
3. No Google Cloud Console, adicione o domínio do site (ex.:
   `https://enzogames.com.br`) em **Origens JavaScript autorizadas**.
4. Faça o deploy. As tabelas são criadas sozinhas na primeira chamada.

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

## Flappy Enzo (easter egg)

Clicar no logo "ENZO GAMES" da home abre o jogo numa janela em tela cheia
(Fechar ou Esc saem). Os scripts só são baixados no primeiro clique.

- `js/flappy-core.js`: regras puras (física, talheres, colisão, pontos).
  O contrato está em `test/flappy-core.test.js`; valores em `CONFIG`.
- `js/flappy.js`: janela, desenho no canvas (360×640 lógico), controles, recorde
  (`localStorage`).
- Artes: originais em `assets/flappy/originais/`; recortes em `assets/flappy/game/`,
  gerados por `node tools/prepare-flappy-assets.js` (rode de novo se trocar um original).
- Plano e decisões: `docs/PLANO-JOGO.md`.
