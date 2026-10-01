# Plano: aba "Lançamentos" no terminal (publicar capítulos em um clique)

Status: **plano de 2026-10-01, nada implementado.** Pedido do Henrique: uma aba dedicada no terminal admin (`admin.html`)
para deixar os capítulos já no site e torná-los visíveis aos leitores em um clique, valendo para os capítulos que já
existem (retroativo) e para os próximos quadrinhos.

## O que já existe (e vamos aproveitar)
- **Gibi escondido:** `hidden: true` (e `revealAt`, data/hora de abertura) no `data/comics.manifest.json`; o `atualizar.js`
  grava no catálogo (`data/database.json`).
- **Quem libera:** tabela `gibis_revelados` + rotas `GET /api/site/revelados` e `POST /api/admin/reveal` (`api/admin.js`);
  comandos `reveal <id>` e `hide <id>` e a tela "Capítulos escondidos" no terminal (`js/admin.js`); tudo vai para o
  `admin_log`. O site filtra no `window.carregarCatalogo` (`js/site.js`), comparando com o relógio do servidor.
- Foi assim que o Capítulo 8 foi escondido e aberto sozinho às 10:00 de 30/09.

## O que falta (por que não basta o que existe)
1. **É por gibi, não por capítulo.** Nos spin-offs um gibi tem vários capítulos (`degustador`, `superkid`, `hatsune-neves`);
   hoje não dá para esconder só o capítulo novo.
2. **Esconder exige deploy.** `hidden` é marcado no manifesto: para um capítulo nascer escondido é preciso editar o
   manifesto e publicar. Só a liberação é em um clique.
3. **A tela só lista o que está escondido.** Não mostra o que já está no ar, quando saiu, nem permite esconder de volta
   com contexto (capa, páginas, data).
4. **Sem data real de lançamento.** O "NOVO" e o destaque da home vão pela ordem (`order`), não pela data em que o leitor
   viu o capítulo. Capítulo escondido não deve virar destaque.
5. **Furos para conferir:** `js/reader.core.js` lê `data/database.json` direto (o link `reader.html?comic=...` de um gibi
   escondido pode abrir); `api/comentarios.js` valida capítulos no catálogo sem filtro; a conquista "ler tudo" /
   "Leitor da Saga" pode contar capítulo ainda não lançado. As imagens ficam públicas no repositório (quem adivinhar o
   endereço vê): aceitável, é "escondido na vitrine", não segredo.

## Desenho

**Estado de cada capítulo** (chave `gibi/capítulo`): `rascunho` (subido e escondido) · `agendado` (abre em data/hora) ·
`no-ar`. Guardado no banco (não no manifesto), para mudar sem deploy.

**Banco** (novo, só `IF NOT EXISTS`): `lancamentos(comic_id, chapter_id, estado, publicar_em, publicado_em, publicado_por,
aviso, PRIMARY KEY (comic_id, chapter_id))`. A tabela `gibis_revelados` continua valendo (compatibilidade) e vira
atalho para "todos os capítulos do gibi".

**Regra de nascimento:** capítulo ou gibi **novo** entra no catálogo como `rascunho` (a skill `comicuploader` passa a
marcar `hidden` por capítulo). **Retroativo:** tudo que já está no ar entra como `no-ar`, com `publicado_em` tirado da
data do primeiro commit da pasta do capítulo (script único); nada muda para o leitor.

**API** (admin): `GET /api/admin/lancamentos` (todos os capítulos com estado, capa, páginas, datas) ·
`POST /api/admin/lancamentos/publicar {comic, capitulo}` · `.../agendar {comic, capitulo, em}` ·
`.../esconder {comic, capitulo}`; cada ação grava no `admin_log`. Público: `GET /api/site/revelados` passa a devolver
também as chaves de capítulo e as datas (o formato antigo segue funcionando).

**Aba "Lançamentos"** (terminal, `js/admin.js`): lista dos capítulos, mais novos primeiro, com miniatura da capa, gibi ·
título, nº de páginas, estado e data. Botões: **Publicar agora** (com confirmação mostrando a capa), **Agendar** (data e
hora), **Esconder**, **Ver como leitor** (o admin abre o capítulo escondido para conferir antes de publicar). Comandos:
`launch`, `publish <gibi>/<cap>`, `schedule <gibi>/<cap> <data hora>`; `reveal` e `hide` continuam como apelidos.

**Site:** `carregarCatalogo` e o leitor filtram **capítulos** (gibi sem nenhum capítulo no ar some); destaque da home e
"NOVO" passam a usar `publicado_em`; conquistas e comentários só contam capítulos no ar.

## Fases
1. **Banco e API** (`api/schema.js`, `api/admin.js`) + testes (`test/lancamentos.test.js`, no estilo de `test/admin.test.js`).
2. **Site:** filtro por capítulo em `js/site.js`, `js/reader.core.js`, `js/main.js`; conquistas e comentários.
3. **Aba e comandos** no terminal; "Ver como leitor" para admin.
4. **Retroativo:** script de preenchimento (`tools/lancamentos-retroativo.js`) e atualização do `comicuploader`.
5. **QA pelo Gemini** (telas e fluxo completo) e, opcional, aviso "Novo capítulo!" na home por alguns dias.

## Decisões do Henrique (com recomendação)
- **Capítulo novo nasce escondido?** Sim (recomendado): você sobe, confere "como leitor" e publica quando quiser.
- **Como o capítulo chega ao site:** continuar pelo `comicuploader` (Claude sobe as imagens, escondidas) é o mais simples e
  é a fase 1 a 4. Subir imagens **pelo navegador** dentro da aba (armazenamento de arquivos novo) fica como fase futura.
- **Agendar por data e hora?** Sim (recomendado; já existe `revealAt`).
- **Aviso "Novo capítulo!" na home** ao publicar? Opcional (fase 5).
