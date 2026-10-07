// ============================================================================
// Upload de capítulos pelo terminal admin (aba "upload"): o Henrique arrasta capa e páginas, confere a
// ordem e publica, sem pedir nada à IA.
//
//   GET  /api/admin/upload/estado     { configurado, modo }            o upload está ligado? (GitHub ou disco local)
//   POST /api/admin/upload/arquivo    corpo = bytes da imagem          guarda a imagem e devolve o `sha` dela
//   POST /api/admin/upload/publicar   { lote: [capítulo, ...] }        monta as pastas e o manifesto e faz UM commit
//   POST /api/admin/gibis/trocar      { trocas: [{ path, sha, ext }] }  troca imagens que já existem (páginas e capas) num commit só
//
// Cada item do lote:
//   { tipo: 'serie' | 'spin', gibi, titulo?, descricao?, capitulo, tituloCapitulo?, escondido?, substituir?,
//     capa: { sha, ext }, paginas: [{ sha, ext }, ...] }          (a ordem do array é a ordem de leitura)
// O servidor escolhe sozinho os caminhos (`assets/Capitulo N/Capa/capa.png`, `.../Paginas/PAG1.png`...), então o
// navegador nunca decide onde um arquivo vai parar. Na produção o commit sai pelo GitHub (segredo GITHUB_TOKEN)
// e o deploy da Cloudflare faz o resto (build refaz o catálogo e as variantes webp). Todo upload vai ao admin_log.
// ============================================================================
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const { registrar } = require('./admin.js');

const MAX_ARQUIVO = 15 * 1024 * 1024;
const MAX_PAGINAS = 80;
const EXTENSOES = ['png', 'jpg', 'webp', 'gif'];
const MANIFESTO = 'data/comics.manifest.json';
const CAMINHO_IMAGEM = /^assets\/(?:Capitulo \d{1,3}|Spin Offs\/[^/\\.]+\/Capitulo \d{1,3})\/(?:Capa|Paginas)\/[^/\\]+\.(?:png|jpe?g|webp|gif)$/i;

/** "Degustador da noite" -> "degustador-da-noite" */
function slug(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Descobre o tipo da imagem pelos primeiros bytes (a extensão do nome não é confiável). */
function extensaoDe(buf) {
    if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
    if (buf.length > 6 && /^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) return 'gif';
    return null;
}

// ------------------------------------------------------------ onde guardar
/** Backend que escreve direto no disco (desenvolvimento local e testes): o Henrique dá o build e o push depois. */
function backendDisco(raiz) {
    const blobs = new Map();
    return {
        modo: 'disco',
        async blob(buf) { const sha = crypto.createHash('sha1').update(buf).digest('hex'); blobs.set(sha, buf); return sha; },
        async ler(rel) { try { return fs.readFileSync(path.join(raiz, rel), 'utf8'); } catch { return null; } },
        async listar(rel) { try { return fs.readdirSync(path.join(raiz, rel)).map((n) => `${rel}/${n}`); } catch { return []; } },
        async commit({ mensagem, arquivos }) {
            // tudo ou nada: confere as imagens antes de escrever qualquer arquivo
            if (arquivos.some((a) => !a.apagar && a.texto == null && !blobs.has(a.sha))) throw new HttpError(400, 'imagem não enviada (envie de novo)');
            for (const a of arquivos) {
                const destino = path.join(raiz, a.path);
                if (a.apagar) { fs.rmSync(destino, { force: true }); continue; }
                fs.mkdirSync(path.dirname(destino), { recursive: true });
                if (a.texto != null) fs.writeFileSync(destino, a.texto);
                else {
                    const buf = blobs.get(a.sha);
                    if (!buf) throw new HttpError(400, 'imagem não enviada (envie de novo)');
                    fs.writeFileSync(destino, buf);
                }
            }
            return { commit: null, mensagem };
        },
    };
}

/** Backend GitHub: blobs + um commit na branch (API Git Data). Precisa de GITHUB_TOKEN com permissão de escrita em "Contents". */
function backendGithub({ token, repo, branch, buscar = fetch }) {
    const base = `https://api.github.com/repos/${repo}`;
    async function gh(rota, { metodo = 'GET', corpo, raw = false } = {}) {
        const r = await buscar(`${base}${rota}`, {
            method: metodo,
            headers: {
                Authorization: `Bearer ${token}`, 'User-Agent': 'enzo-games-upload', 'X-GitHub-Api-Version': '2022-11-28',
                Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
                ...(corpo ? { 'Content-Type': 'application/json' } : {}),
            },
            body: corpo ? JSON.stringify(corpo) : undefined,
        });
        if (r.status === 404 && metodo === 'GET') return null;
        if (r.status === 401 || r.status === 403) throw new HttpError(502, 'o GitHub recusou o token (confira GITHUB_TOKEN e a permissão "Contents: Read and write")');
        if (!r.ok) throw new HttpError(r.status === 409 || r.status === 422 ? 409 : 502, `GitHub respondeu ${r.status}`);
        return raw ? r.text() : r.json();
    }
    return {
        modo: 'github',
        async blob(buf) { return (await gh('/git/blobs', { metodo: 'POST', corpo: { content: buf.toString('base64'), encoding: 'base64' } })).sha; },
        async ler(rel) { return gh(`/contents/${encodeURI(rel)}?ref=${branch}`, { raw: true }); },
        async listar(rel) {
            const itens = await gh(`/contents/${encodeURI(rel)}?ref=${branch}`);
            return Array.isArray(itens) ? itens.map((i) => i.path) : [];
        },
        async commit({ mensagem, arquivos }) {
            const ref = await gh(`/git/ref/heads/${branch}`);
            const pai = await gh(`/git/commits/${ref.object.sha}`);
            const entradas = arquivos.map((a) => (a.apagar
                ? { path: a.path, mode: '100644', type: 'blob', sha: null }
                : a.texto != null
                    ? { path: a.path, mode: '100644', type: 'blob', content: a.texto }
                    : { path: a.path, mode: '100644', type: 'blob', sha: a.sha }));
            const arvore = await gh('/git/trees', { metodo: 'POST', corpo: { base_tree: pai.tree.sha, tree: entradas } });
            const novo = await gh('/git/commits', { metodo: 'POST', corpo: { message: mensagem, tree: arvore.sha, parents: [ref.object.sha] } });
            await gh(`/git/refs/heads/${branch}`, { metodo: 'PATCH', corpo: { sha: novo.sha, force: false } });
            return { commit: novo.sha, mensagem };
        },
    };
}

/** Escolhe o backend pelo ambiente. Sem token na produção, o upload fica desligado (estado.configurado = false). */
function criarBackend(env, raiz) {
    if (env.GITHUB_TOKEN) {
        return backendGithub({ token: String(env.GITHUB_TOKEN).trim(), repo: env.GITHUB_REPO || 'mmacedok/Enzo-Games-Oficial', branch: env.GITHUB_BRANCH || 'main' });
    }
    if (env.NODE_ENV !== 'production' && raiz) return backendDisco(raiz);
    return null;
}

// ------------------------------------------------------------ manifesto
/** Lê o manifesto, mantendo o fim de linha (CRLF) do arquivo ao gravar de volta. */
function abrirManifesto(texto) {
    const crlf = texto.includes('\r\n');
    const dados = JSON.parse(texto);
    return { dados, serializar: () => { const s = JSON.stringify(dados, null, 2) + '\n'; return crlf ? s.replace(/\n/g, '\r\n') : s; } };
}

const nomeCapitulo = (n) => `Capitulo ${n}`;

function validarItem(item) {
    if (!item || typeof item !== 'object') throw new HttpError(400, 'item do lote inválido');
    if (!['serie', 'spin'].includes(item.tipo)) throw new HttpError(400, 'tipo deve ser "serie" ou "spin"');
    if (!/^\d{1,3}$/.test(String(item.capitulo)) || Number(item.capitulo) < 1) throw new HttpError(400, 'número de capítulo inválido');
    const arquivo = (a) => a && /^[0-9a-f]{40}$/.test(a.sha) && EXTENSOES.includes(a.ext);
    if (!arquivo(item.capa)) throw new HttpError(400, 'falta a capa');
    if (!Array.isArray(item.paginas) || !item.paginas.length || item.paginas.length > MAX_PAGINAS || !item.paginas.every(arquivo)) throw new HttpError(400, 'páginas inválidas');
    for (const campo of ['titulo', 'descricao', 'tituloCapitulo']) {
        if (item[campo] != null && (typeof item[campo] !== 'string' || item[campo].length > 120)) throw new HttpError(400, `${campo} inválido`);
    }
    if (item.tipo === 'spin' && !String(item.gibi || '').trim()) throw new HttpError(400, 'informe o gibi do spin-off');
}

/** Pasta de `assets/Spin Offs/` que corresponde a um gibi (mesmo nome sem acento/maiúscula) ou null. */
async function pastaDoSpin(backend, alvo) {
    const pastas = await backend.listar('assets/Spin Offs');
    return pastas.map((p) => p.split('/').pop()).find((nome) => slug(nome) === slug(alvo)) || null;
}

/** Prepara os arquivos de UM capítulo e acerta o manifesto. Devolve { arquivos, resumo }. */
async function prepararItem(backend, manifesto, item) {
    validarItem(item);
    const n = String(Number(item.capitulo));
    const hidden = item.escondido === true;
    let pasta;
    if (item.tipo === 'serie') {
        pasta = `assets/${nomeCapitulo(n)}`;
        const chave = `capitulo-${n}`;
        const atual = manifesto.dados.comics[chave] || {};
        const novo = { ...atual };
        if (item.descricao) novo.description = item.descricao.trim();
        if (hidden) novo.hidden = true;
        manifesto.dados.comics[chave] = novo;
    } else {
        const comics = manifesto.dados.comics;
        let chave = Object.keys(comics).find((k) => k === item.gibi || comics[k].id === item.gibi || slug(k) === slug(item.gibi) || slug(comics[k].title || '') === slug(item.gibi));
        let nomePasta = await pastaDoSpin(backend, chave || item.gibi);
        if (!chave) {
            // gibi novo: entra no fim da fila dos spin-offs
            if (!item.titulo && !item.gibi) throw new HttpError(400, 'informe o nome do gibi novo');
            const titulo = (item.titulo || item.gibi).trim();
            chave = slug(titulo);
            const ordens = Object.values(comics).filter((c) => c.featured === false).map((c) => c.order || 0);
            comics[chave] = { id: chave, title: titulo, description: (item.descricao || titulo).trim(), order: Math.max(100, ...ordens) + 10, featured: false, chapters: {} };
        }
        nomePasta ||= (item.titulo || item.gibi).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ._-]+/g, '').trim();
        if (!nomePasta) throw new HttpError(400, 'nome de gibi inválido');
        pasta = `assets/Spin Offs/${nomePasta}/${nomeCapitulo(n)}`;
        const gibi = comics[chave];
        gibi.chapters ??= {};
        const cap = { ...(gibi.chapters[n] || {}) };
        cap.title = (item.tituloCapitulo || cap.title || `Capítulo ${n}`).trim();
        if (hidden) cap.hidden = true;
        gibi.chapters[n] = cap;
    }

    const existentes = [...await backend.listar(`${pasta}/Capa`), ...await backend.listar(`${pasta}/Paginas`)];
    if (existentes.length && !item.substituir) {
        throw new HttpError(409, `${item.tipo === 'serie' ? 'O capítulo' : 'O capítulo'} ${n} já existe (marque "substituir" para trocar)`, { existe: true, capitulo: n });
    }
    const arquivos = [{ path: `${pasta}/Capa/capa.${item.capa.ext}`, sha: item.capa.sha }];
    item.paginas.forEach((p, i) => arquivos.push({ path: `${pasta}/Paginas/PAG${i + 1}.${p.ext}`, sha: p.sha }));
    const novos = new Set(arquivos.map((a) => a.path));
    for (const velho of existentes) if (!novos.has(velho)) arquivos.push({ path: velho, apagar: true });
    return { arquivos, resumo: `${item.tipo === 'serie' ? 'Capítulo' : item.gibi + ' cap.'} ${n}: capa e ${item.paginas.length} páginas${hidden ? ' (escondido)' : ''}` };
}

const rotas = [
    {
        metodo: 'GET', caminho: '/api/admin/upload/estado', admin: true,
        async executar(ctx) { return { configurado: Boolean(ctx.upload), modo: ctx.upload?.modo || null }; },
    },
    {
        // Corpo = bytes da imagem (sem JSON). `bruto` pede ao handler uma checagem de origem própria (cabeçalho X-Enzo-Upload).
        metodo: 'POST', caminho: '/api/admin/upload/arquivo', admin: true, bruto: true,
        async executar(ctx) {
            if (!ctx.upload) throw new HttpError(503, 'upload não configurado (falta GITHUB_TOKEN)');
            const buf = Buffer.from(await ctx.request.arrayBuffer());
            if (!buf.length) throw new HttpError(400, 'arquivo vazio');
            if (buf.length > MAX_ARQUIVO) throw new HttpError(413, 'imagem grande demais (máximo 15 MB)');
            const ext = extensaoDe(buf);
            if (!ext) throw new HttpError(415, 'só PNG, JPG, WebP ou GIF');
            return { sha: await ctx.upload.blob(buf), ext, bytes: buf.length };
        },
    },
    {
        metodo: 'POST', caminho: '/api/admin/upload/publicar', admin: true,
        async executar(ctx) {
            if (!ctx.upload) throw new HttpError(503, 'upload não configurado (falta GITHUB_TOKEN)');
            const { lote } = await ctx.corpo();
            if (!Array.isArray(lote) || !lote.length || lote.length > 10) throw new HttpError(400, 'envie de 1 a 10 capítulos por vez');
            const bruto = await ctx.upload.ler(MANIFESTO);
            if (!bruto) throw new HttpError(500, 'manifesto não encontrado');
            const manifesto = abrirManifesto(bruto);
            const arquivos = [];
            const resumos = [];
            const vistos = new Set();
            for (const item of lote) {
                const chave = item?.tipo === 'serie' ? `s${item.capitulo}` : `${slug(item?.gibi || '')}/${item?.capitulo}`;
                if (vistos.has(chave)) throw new HttpError(400, 'o mesmo capítulo aparece duas vezes no lote');
                vistos.add(chave);
                const r = await prepararItem(ctx.upload, manifesto, item);
                arquivos.push(...r.arquivos);
                resumos.push(r.resumo);
            }
            arquivos.push({ path: MANIFESTO, texto: manifesto.serializar() });
            const mensagem = `Upload pelo terminal: ${resumos.join('; ')}`;
            const feito = await ctx.upload.commit({ mensagem, arquivos });
            await registrar(ctx, 'upload', null, resumos.join('; '));
            return { ok: true, commit: feito.commit, resumos, modo: ctx.upload.modo };
        },
    },
    {
        // Troca páginas ou capas que já existem (programa Gibis do Enzo OS). O caminho tem de ser de uma imagem de
        // capítulo (assets/Capitulo N/... ou assets/Spin Offs/<gibi>/Capitulo N/...) que exista de verdade na pasta.
        metodo: 'POST', caminho: '/api/admin/gibis/trocar', admin: true,
        async executar(ctx) {
            if (!ctx.upload) throw new HttpError(503, 'upload não configurado (falta GITHUB_TOKEN)');
            const { trocas } = await ctx.corpo();
            if (!Array.isArray(trocas) || !trocas.length || trocas.length > 60) throw new HttpError(400, 'envie de 1 a 60 trocas por vez');
            const arquivos = [];
            const vistos = new Set();
            const dirs = new Map();
            for (const t of trocas) {
                if (!t || typeof t.path !== 'string' || !CAMINHO_IMAGEM.test(t.path)) throw new HttpError(400, 'caminho de imagem inválido');
                if (!/^[0-9a-f]{40}$/.test(String(t.sha)) || !EXTENSOES.includes(t.ext)) throw new HttpError(400, 'imagem nova inválida');
                if (vistos.has(t.path)) throw new HttpError(400, 'a mesma imagem aparece duas vezes');
                vistos.add(t.path);
                const dir = t.path.slice(0, t.path.lastIndexOf('/'));
                if (!dirs.has(dir)) dirs.set(dir, await ctx.upload.listar(dir));
                if (!dirs.get(dir).includes(t.path)) throw new HttpError(404, `a imagem não existe: ${t.path.split('/').slice(-3).join('/')}`);
                const novo = t.path.replace(/\.[^./]+$/,`.${t.ext}`);
                arquivos.push({ path: novo, sha: t.sha });
                if (novo !== t.path) arquivos.push({ path: t.path, apagar: true });
            }
            const resumo = `${trocas.length} imagem(ns) trocada(s): ${trocas.slice(0, 3).map((t) => t.path.split('/').slice(-3).join('/')).join(', ')}${trocas.length > 3 ? '…' : ''}`;
            const feito = await ctx.upload.commit({ mensagem: `Troca de imagens pelo terminal: ${resumo}`, arquivos });
            await registrar(ctx, 'gibi-troca', null, resumo);
            return { ok: true, commit: feito.commit, trocadas: trocas.length, modo: ctx.upload.modo };
        },
    },
];

module.exports = { rotas, criarBackend, backendDisco, backendGithub, slug, extensaoDe, abrirManifesto };
