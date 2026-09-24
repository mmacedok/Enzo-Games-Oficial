# Plano: comentários nos gibis ("Cartas dos Leitores")

Status: **fases 1–3 implementadas em 2026-09-24** (API, seção no leitor, moderação no site),
aguardando os testes do Gemini (tarefa 18 da Bridge). Fase 4 (terminal) ficou para depois.

Decisões do Henrique (2026-09-24):
- celular: última página → "Ler próximo" → comentários (confirmado);
- a moderação fica **embutida em cada comentário**, sem precisar do terminal: três botões
  só para admin — **Apagar**, **Censurar** e **Banir** o autor.

## O que o Henrique pediu
- Uma seção de comentários no fim de cada gibi.
- **Computador:** à direita da última página.
- **Celular:** embaixo da última página.
- Só o admin vê, em cima de cada comentário, as opções de **apagar** ou **censurar**.
- Censurar = escolher qualquer palavra e cobri-la com uma **tarja preta**.

## Decisões (com a recomendação de cada uma)
| Pergunta | Recomendação | Por quê |
|---|---|---|
| Comentários por gibi ou por capítulo? | **Por capítulo** (`comic_id` + `chapter_id`) | A série tem 1 capítulo por gibi (dá no mesmo); o Degustador tem 4, e cada um merece a sua conversa. |
| Quem comenta? | **Só quem tem login** (Google) | Já temos conta, ban e anti-spam por usuário. Convidado vê os comentários e um convite "Entre para comentar". |
| Respostas e curtidas? | **Não na 1ª versão** (fase 6) | Lista simples primeiro, sem inflar o escopo. |
| O autor pode editar? | **Não**, só apagar o próprio comentário | Com edição, dava para desfazer uma censura. |
| Celular: comentários antes ou depois do botão "Ler próximo"? | **Última página → botão "Ler próximo" → comentários** | Quem quer seguir lendo não precisa passar pela conversa. *Se preferir os comentários colados na página, troco a ordem.* |
| Nome da seção | **"Cartas dos Leitores"** | Como a seção de cartas dos gibis antigos, no mesmo estilo da Ficha do Leitor. |

## Como fica na tela
### Computador (a partir de ~1024px)
O leitor é uma coluna de páginas, uma embaixo da outra. Na **última página** do capítulo,
a linha vira uma grade de duas colunas:

```
┌──────────────────────────┐ ┌───────────────────┐
│                          │ │ CARTAS DOS        │
│      última página       │ │ LEITORES  (12)    │
│                          │ │ ┌───────────────┐ │
│                          │ │ │ escreva aqui… │ │
│                          │ │ └───────────────┘ │
│                          │ │ (o) Ana S.        │
│                          │ │  "que final!"     │
│                          │ │ (o) Zé L.         │
│                          │ │  "o ████ voltou"  │
└──────────────────────────┘ └───────────────────┘
          [ Ler Capítulo 6 → ]
```
- O painel tem ~360px e fica **grudado** (`position: sticky`) enquanto a página rola, com rolagem própria.
- A página continua com o mesmo tamanho de hoje: o painel ocupa a sobra da direita. Se a tela não tiver sobra (zoom alto), ele desce para baixo da página, como no celular.

### Celular
Última página → botão "Ler próximo" → Cartas dos Leitores, em largura cheia, com o
mesmo recuo de 16px do resto do site.

### Visual (gibi, igual à Ficha do Leitor)
- Cada comentário é um **balão de fala** com o medalhão da foto do Google, o nome abreviado ("Henrique M."), a data e o Nº do leitor. O nome abre a ficha pública.
- O campo de escrever é um balão vazio com o botão "Mandar carta!".
- **Tarja de censura:** a palavra vira um retângulo preto, levemente torto, do tamanho dela (o mesmo clima da tarja do Cabo Côco). Passar o mouse **não** revela nada.
- Comentário apagado some da lista. Opcional: "✂ carta removida pela redação".

### Só o admin vê
Uma faixa pequena em cima de cada comentário: `✂ Apagar` · `▇ Censurar` · `⛔ Banir`.
Apagar e Banir pedem um segundo clique ("Certeza?") em até 4 s. Banir esconde todas as
cartas do autor (e derruba a sessão dele); dá para desbanir no terminal (`unban`).
- **Apagar:** pede confirmação e some na hora.
- **Censurar:** o texto vira palavras clicáveis. Clicar liga ou desliga a tarja de cada palavra, e "Salvar" grava. Dá para tirar a tarja depois do mesmo jeito.

## Segurança: a palavra censurada nunca sai do servidor
- O banco guarda o texto original **e** a lista de trechos censurados (`[[início, fim], …]`).
- A API pública manda o texto **já cortado em pedaços**: `[{ "t": "o " }, { "tarja": 4 }, { "t": " voltou" }]`. A palavra escondida nunca chega ao navegador de quem não é admin: nem no HTML, nem no JSON, nem no "inspecionar elemento".
- Só o admin recebe o texto original junto com os trechos, para poder editar a censura.
- O texto sempre entra na página com `textContent`, nunca com `innerHTML`.

## Banco (em `api/schema.js`, com IF NOT EXISTS como o resto)
```sql
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comic_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    texto TEXT NOT NULL,              -- original, até 500 letras
    censuras TEXT,                    -- JSON [[inicio, fim], ...] ou null
    apagado_em BIGINT,                -- null = visível (apagar é "soft delete")
    apagado_por TEXT,                 -- id de quem apagou (autor ou admin)
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_capitulo ON comments(comic_id, chapter_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_usuario ON comments(user_id, created_at);
```
O "soft delete" deixa o terminal ver o que foi apagado, e por quem.

## API (novo `api/comentarios.js`)
| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/comments?comic=&chapter=&antes=` | todos | 30 por vez, mais novos primeiro, já em pedaços com tarja; `isMe` e `podeApagar` em cada um |
| `POST /api/comments` `{comicId, chapterId, texto}` | logado | cria o comentário (regras abaixo) |
| `POST /api/comments/:id/delete` | autor ou admin | apaga (soft delete) |
| `POST /api/admin/comments/:id/censor` `{trechos}` | admin | grava a lista de tarjas (lista vazia = sem censura) |
| `GET /api/admin/comments?q=&apagados=` | admin | comentários recentes de todos os gibis, para o terminal |

Toda ação de admin entra no `admin_log` (`comment-rm`, `comment-censor`), como já acontece hoje.

**Regras ao criar:**
- de 1 a 500 letras;
- o mesmo limpador da fala da Ficha: sem caracteres invisíveis nem links;
- no máximo 1 comentário a cada 30 s e 30 por dia por conta;
- banido não comenta (a sessão já cai hoje).

**Gibi e capítulo válidos:** a Function não tem o `data/database.json`. Na hora do build, o `tools/build-function.mjs` embute a lista de `gibi/capítulo` que existem (esbuild `define`), e o servidor recusa ids fora dela.

**Trechos da censura:** o servidor confere que cada `[início, fim]` cabe no texto, junta os que se encostam e aceita no máximo 50.

## Terminal (`admin.html`)
- `comments [busca]`: últimos comentários, com gibi, capítulo, autor e texto (o censurado aparece destacado).
- `rmc <n>`: apaga, pedindo `[s/N]`.
- `censor <n> <palavra>` / `uncensor <n> <palavra>`: liga ou desliga a tarja numa palavra.
- Na conta aberta (`open`), uma seção nova "comentários" com os comentários da pessoa.

## Fases
1. **Banco + API + testes da API** (`test/comentarios.test.js`): criar, listar em pedaços, a palavra censurada nunca aparece no JSON público, apagar (autor e admin), comum não censura, limites, anti-spam, gibi inexistente.
2. **Seção no leitor** (`js/comentarios.js` + css): layout dos dois tamanhos, lista paginada ("carregar mais"), formulário, convite para entrar, contador na manchete.
3. **Moderação no site** (só admin): faixa apagar/censurar e o modo "clicar nas palavras".
4. **Terminal:** comandos `comments`, `rmc`, `censor`/`uncensor` e a seção na conta aberta.
5. **Testes grandes no Gemini** (`/teamwork-preview`): layout desktop e celular em todos os gibis, sem login / comum / admin, spam, textos longos e emojis. Os itens entram em `docs/TESTES-PENDENTES.md`.
6. **Depois (opcional):** respostas, curtidas, botão "denunciar" com fila no terminal, filtro automático de palavrões que já sai censurado (o admin pode tirar a tarja).

## Arquivos que mudam
- Novos: `api/comentarios.js`, `js/comentarios.js`, `test/comentarios.test.js`.
- Mudam:
  - `api/schema.js`, `api/handler.js`;
  - `tools/build-function.mjs` (a lista de capítulos);
  - `js/reader.core.js`: em `renderChapter()`, a última `.page-wrapper` ganha o painel ao lado, e o `buildNextChapterCard()` continua como está;
  - `reader.html`, `css/style.css`;
  - `js/admin.js`;
  - `docs/TESTES-PENDENTES.md`, `README.md`.
