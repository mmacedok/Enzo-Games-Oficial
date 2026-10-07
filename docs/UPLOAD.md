# Upload de capítulos pelo terminal

No Enzo OS (`admin.html`) existem os programas **Upload** (capítulos novos) e **Gibis** (trocar páginas de capítulos que já existem). O comando `upload` do Terminal continua funcionando.

## Como usar
1. Abra `admin.html` → `upload`.
2. **Arraste** as imagens (ou a pasta inteira) para a caixa. Dá para soltar vários capítulos de uma vez.
3. O sistema lê os **nomes** e monta um cartão por capítulo:
   - `capa`, `cover` ou `PAGINA 00` = capa;
   - `PAG1`, `PAGINA 02`, `pagina-3`... = ordem das páginas (se faltar número, a página vai para o fim);
   - `CAP 9` / `CAPITULO 9` no nome do arquivo ou da pasta = número do capítulo;
   - nome de pasta (ex.: `DOUGXBOX - CAP 01`) = gibi do spin-off. Sem nome de gibi, é capítulo da série principal.
4. Em cada cartão, confira/corrija:
   - **Vai para**: *Capítulo da série principal* (campo "frase da capa") ou *Spin-off* (escolha o gibi da lista ou "➕ spin-off novo…" e digite o nome);
   - **Nº do capítulo** e, no spin-off, o **título do capítulo**;
   - **publicar já no site** (desmarcado = sobe escondido e você libera na aba `lançamentos`);
   - **a ordem**: arraste as miniaturas, use ◀ ▶, ✕ para tirar, ou clique numa página para ver grande (anterior/próxima, mover, ★ usar como capa, tirar). Se o número no nome do arquivo diverge da posição, aparece `3 (≠4)` em âmbar.
5. Clique em **🚀 enviar e publicar**. O botão só libera quando não falta nada (capa, páginas, nº, nome do spin-off).
6. No site de verdade o envio vira **um commit no GitHub** e a Cloudflare faz o deploy sozinha (~2 minutos). Capítulo que já existe só é trocado se você marcar "substituir".

Limites: 15 MB por imagem (PNG, JPG, WebP ou GIF), até 80 páginas por capítulo, até 10 capítulos por envio.
Fica fora do upload (continua sendo tarefa à parte): conquista "ler tudo", ficha do personagem, mapa e músicas.

## Ligar o upload no site de verdade (uma vez só): a chave do GitHub
O terminal precisa de uma "chave" (token) para o site poder gravar no repositório. Ela fica **só na Cloudflare**, nunca no chat nem no código.

### 1. Criar o token no GitHub
1. Entre no GitHub com a conta dona do repositório (`mmacedok`).
2. Clique na sua foto (canto superior direito) → **Settings**.
3. Menu da esquerda, no fim: **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. **Token name**: `enzo-games-upload`. **Expiration**: 1 ano (anote para renovar).
5. **Repository access**: *Only select repositories* → escolha **Enzo-Games-Oficial**.
6. **Permissions** → **Repository permissions** → **Contents** → **Read and write**. (Metadata: Read-only entra sozinho. Não precisa de mais nada.)
7. **Generate token** e **copie** o texto que começa com `github_pat_` (ele só aparece uma vez).

### 2. Guardar na Cloudflare
1. Painel da Cloudflare → **Workers & Pages** → projeto **enzo-games-oficial** → **Settings** → **Variables and Secrets** (ou "Environment variables").
2. **Add** → tipo **Secret**, nome `GITHUB_TOKEN`, valor = o token copiado → **Save** (ambiente *Production*).
3. Vá em **Deployments** → no último deploy, **Retry deployment** (segredo novo só vale num deploy novo; qualquer push também serve).
4. Abra `admin.html` → `upload`: se aparecer a caixa de arrastar (sem o aviso "Upload desligado"), está ligado.

Opcionais (só se mudar o repositório ou a branch): `GITHUB_REPO` (padrão `mmacedok/Enzo-Games-Oficial`) e `GITHUB_BRANCH` (padrão `main`).

### Segurança
- Só quem é admin (`ADMIN_EMAILS`) consegue chamar as rotas de upload; todo upload vai para o `admin_log`.
- O servidor decide os caminhos dos arquivos; o navegador só manda imagens e a ordem.
- Se o token vazar: GitHub → Settings → Developer settings → apague o token e crie outro.

## Testar no computador
Sem `GITHUB_TOKEN` e fora da produção, o upload grava direto na pasta do projeto ("Modo local"): depois rode `npm run build` e dê o push.


## Trocar páginas ou capas (programa Gibis)
1. Abra **Gibis**, escolha o gibi (e o capítulo, nos spin-offs).
2. Em cada página: **trocar…** (escolhe o arquivo) ou **arraste** a imagem em cima da página. Clique na miniatura para ver grande.
3. Para várias de uma vez, solte os arquivos na faixa pontilhada: o número no nome decide a página (`PAG3.png` troca a página 3; `capa` troca a capa).
4. Páginas trocadas ficam com borda colorida e a etiqueta NOVA. **Publicar** envia tudo num commit só (até 60 imagens). Se a extensão mudar (png para jpg), a antiga é apagada.
5. No site de verdade a Cloudflare refaz as variantes webp no deploy (~2 minutos); até lá a estante pode mostrar a imagem antiga.
