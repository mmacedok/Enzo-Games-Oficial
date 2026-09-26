// ============================================================================
// Cartas dos Leitores: comentários no fim de cada capítulo (docs/PLANO-COMENTARIOS.md).
//   GET  /api/comments?comic=&chapter=&antes=   30 por vez, mais novos primeiro
//   POST /api/comments                          { comicId, chapterId, texto } (logado)
//   POST /api/comments/:id/delete               autor ou admin
//   POST /api/admin/comments/:id/censor         { trechos: [[inicio, fim], ...] } (admin)
// Censura: o banco guarda o texto original e os trechos; o público recebe o
// texto já em pedaços ({ t } e { tarja }) — a palavra escondida nunca sai do
// servidor. Só o admin recebe o original, para poder mexer na censura.
// Comentário de conta banida some junto com a conta.
// ============================================================================
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { HttpError } = require('./http.js');
const { nomePublico } = require('./auth.js');
const { ehAdmin, registrar } = require('./admin.js');
const { UUID, ID, CONTROLE_TEXTO, LINK } = require('./validacao.js');

const TEXTO_MAX = 500;
const POR_PAGINA = 30;
const INTERVALO = 30 * 1000;
const POR_DIA = 30;
const DIA = 24 * 60 * 60 * 1000;
const TRECHOS_MAX = 50;
const TARJA_MAX = 12;

// ------------------------------------------------------------ capítulos que existem
// Na Netlify Function o esbuild troca process.env.ENZO_CAPITULOS pela lista
// (tools/build-function.mjs); no computador ela vem de data/database.json.
let capitulos = null;
let lidoEm = 0;
let falhouEm = 0;
function capitulosValidos() {
    const embutido = process.env.ENZO_CAPITULOS;
    if (embutido) return (capitulos ??= new Set(JSON.parse(embutido)));
    if (capitulos && Date.now() - lidoEm < 60_000) return capitulos;
    if (Date.now() - falhouEm < 60_000) return null;   // falhou agora há pouco: não relê o catálogo
    try {
        const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'database.json'), 'utf8'));
        capitulos = new Set(catalogo.comics.flatMap((c) => (c.chapters || []).map((cap) => `${c.id}/${cap.id}`)));
        lidoEm = Date.now();
    } catch {
        capitulos = null;   // sem catálogo: só confere o formato dos ids
        falhouEm = Date.now();
    }
    return capitulos;
}

function exigirCapitulo(comicId, chapterId) {
    if (typeof comicId !== 'string' || typeof chapterId !== 'string' || !ID.test(comicId) || !ID.test(chapterId)) {
        throw new HttpError(400, 'gibi ou capítulo inválido');
    }
    const validos = capitulosValidos();
    if (validos && !validos.has(`${comicId}/${chapterId}`)) throw new HttpError(404, 'capítulo não encontrado');
    return { comicId, chapterId };
}

// ------------------------------------------------------------ texto e censura
/** Texto limpo: sem invisíveis, espaços juntados, no máximo uma linha em branco seguida. */
function limparTexto(texto) {
    if (typeof texto !== 'string') throw new HttpError(400, 'escreva alguma coisa');
    const limpo = texto.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROLE_TEXTO, ' ')
        .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n')
        .replace(/\n{3,}/g, '\n\n').trim();
    if (!limpo) throw new HttpError(400, 'escreva alguma coisa');
    if ([...limpo].length > TEXTO_MAX) throw new HttpError(400, `o comentário tem no máximo ${TEXTO_MAX} letras`);
    if (LINK.test(limpo)) throw new HttpError(400, 'sem links nos comentários');
    return limpo;
}

/** Trechos válidos, em ordem e sem sobreposição (os que se encostam viram um só). */
function normalizarTrechos(trechos, tamanho) {
    if (!Array.isArray(trechos) || trechos.length > TRECHOS_MAX) throw new HttpError(400, 'trechos inválidos');
    const ordenados = trechos.map((t) => {
        if (!Array.isArray(t) || t.length !== 2 || !t.every(Number.isSafeInteger)) throw new HttpError(400, 'trechos inválidos');
        const [a, b] = t;
        if (a < 0 || b > tamanho || a >= b) throw new HttpError(400, 'trecho fora do texto');
        return [a, b];
    }).sort((x, y) => x[0] - y[0]);
    const juntos = [];
    for (const [a, b] of ordenados) {
        const ultimo = juntos[juntos.length - 1];
        if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b);
        else juntos.push([a, b]);
    }
    return juntos;
}

function lerTrechos(json) {
    try { const t = JSON.parse(json || '[]'); return Array.isArray(t) ? t : []; } catch { return []; }
}

/** [{ t: 'texto' }, { tarja: n }] — o que o público vê. */
function pedacos(texto, trechos) {
    const saida = [];
    let pos = 0;
    for (const [a, b] of trechos) {
        if (a > pos) saida.push({ t: texto.slice(pos, a) });
        saida.push({ tarja: Math.min(TARJA_MAX, Math.max(2, [...texto.slice(a, b)].length)) });
        pos = b;
    }
    if (pos < texto.length) saida.push({ t: texto.slice(pos) });
    return saida;
}

function comentario(ctx, l, admin) {
    const trechos = lerTrechos(l.censuras);
    const eu = ctx.usuario?.id === l.user_id;
    const c = {
        id: l.id,
        autor: { id: l.user_id, name: nomePublico(l.display_name), avatarUrl: l.avatar_url || null },
        pedacos: pedacos(l.texto, trechos),
        censurado: trechos.length > 0,
        em: Number(l.created_at),
        isMe: eu,
        podeApagar: eu || admin,
    };
    if (admin) Object.assign(c, { texto: l.texto, trechos, autorAdmin: ehAdmin(ctx.config, { email: l.email }) });
    return c;
}

// ------------------------------------------------------------ consultas
const CAMPOS = `c.id, c.user_id, c.texto, c.censuras, c.created_at, u.display_name, u.avatar_url, u.email`;

const FILTROS = `c.comic_id = $1 AND c.chapter_id = $2 AND c.apagado_em IS NULL AND u.role <> 'banned'`;

async function buscar(ctx, id) {
    if (!UUID.test(id)) throw new HttpError(404, 'comentário não encontrado');
    const [l] = await ctx.db.query(
        `SELECT ${CAMPOS}, c.comic_id, c.chapter_id FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.id = $1 AND c.apagado_em IS NULL`, [id]);
    if (!l) throw new HttpError(404, 'comentário não encontrado');
    return l;
}

const rotas = [
    {
        metodo: 'GET', caminho: '/api/comments',
        async executar(ctx) {
            const busca = ctx.url.searchParams;
            const { comicId, chapterId } = exigirCapitulo(busca.get('comic'), busca.get('chapter'));
            const antes = Number.parseInt(busca.get('antes'), 10);
            const admin = ehAdmin(ctx.config, ctx.usuario);
            const linhas = await ctx.db.query(
                `SELECT * FROM (
                     SELECT ${CAMPOS}, c.comic_id, c.chapter_id, COUNT(*) OVER () AS total
                       FROM comments c JOIN users u ON u.id = c.user_id
                      WHERE ${FILTROS}
                 ) t
                 WHERE $3::bigint IS NULL OR t.created_at < $3
                 ORDER BY t.created_at DESC, t.id LIMIT $4`,
                [comicId, chapterId, Number.isSafeInteger(antes) ? antes : null, POR_PAGINA + 1]);
            // Página vazia não traz o total: aí conta na mão (caso raro).
            let total = linhas.length ? Number(linhas[0].total) : null;
            if (total === null) {
                const [{ total: contado }] = await ctx.db.query(
                    `SELECT COUNT(*) AS total FROM comments c JOIN users u ON u.id = c.user_id
                      WHERE ${FILTROS}`, [comicId, chapterId]);
                total = Number(contado);
            }
            return {
                comments: linhas.slice(0, POR_PAGINA).map((l) => comentario(ctx, l, admin)),
                total,
                maisAntigos: linhas.length > POR_PAGINA,
                admin,
            };
        },
    },
    {
        metodo: 'POST', caminho: '/api/comments', login: true,
        async executar(ctx) {
            const corpo = await ctx.corpo();
            const { comicId, chapterId } = exigirCapitulo(corpo.comicId, corpo.chapterId);
            const texto = limparTexto(corpo.texto);
            const agora = ctx.agora();
            // Confere o intervalo e o limite do dia já na inserção: sem corrida entre
            // duas cartas mandadas no mesmo instante.
            const id = crypto.randomUUID();
            const criadas = await ctx.db.query(
                `INSERT INTO comments (id, user_id, comic_id, chapter_id, texto, created_at)
                 SELECT $1, $2, $3, $4, $5, $6
                  WHERE NOT EXISTS (SELECT 1 FROM comments
                                     WHERE user_id = $2 AND created_at > $6::bigint - $7::bigint)
                    AND (SELECT COUNT(*) FROM comments
                          WHERE user_id = $2 AND created_at > $6::bigint - $8::bigint) < $9::int
                 RETURNING id`,
                [id, ctx.usuario.id, comicId, chapterId, texto, agora, INTERVALO, DIA, POR_DIA]);
            if (criadas.length === 0) {
                const [{ ultimo }] = await ctx.db.query(
                    'SELECT MAX(created_at) AS ultimo FROM comments WHERE user_id = $1', [ctx.usuario.id]);
                if (ultimo !== null && agora - Number(ultimo) < INTERVALO) {
                    throw new HttpError(429, 'calma! espere uns segundos antes de mandar outra carta');
                }
                throw new HttpError(429, `limite de ${POR_DIA} cartas por dia`);
            }
            const l = await buscar(ctx, id);
            return { comment: comentario(ctx, l, ehAdmin(ctx.config, ctx.usuario)) };
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/comments\/([^/]{1,64})\/delete$/, login: true,
        async executar(ctx) {
            const l = await buscar(ctx, ctx.params[0]);
            const admin = ehAdmin(ctx.config, ctx.usuario);
            if (l.user_id !== ctx.usuario.id && !admin) throw new HttpError(403, 'só quem escreveu pode apagar');
            await ctx.db.query('UPDATE comments SET apagado_em = $2, apagado_por = $3 WHERE id = $1',
                [l.id, ctx.agora(), ctx.usuario.id]);
            if (l.user_id !== ctx.usuario.id) await registrar(ctx, 'comment-rm', l.user_id, `${l.comic_id}/${l.chapter_id}: ${l.texto}`);
            return { id: l.id, deleted: true };
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/admin\/comments\/([^/]{1,64})\/censor$/, admin: true,
        async executar(ctx) {
            const l = await buscar(ctx, ctx.params[0]);
            const trechos = normalizarTrechos((await ctx.corpo()).trechos, l.texto.length);
            await ctx.db.query('UPDATE comments SET censuras = $2 WHERE id = $1',
                [l.id, trechos.length ? JSON.stringify(trechos) : null]);
            const escondido = trechos.map(([a, b]) => l.texto.slice(a, b)).join(', ');
            await registrar(ctx, 'comment-censor', l.user_id, trechos.length ? `tarja: ${escondido}` : 'sem tarja');
            return { comment: comentario(ctx, { ...l, censuras: JSON.stringify(trechos) }, true) };
        },
    },
];

module.exports = { rotas, limparTexto, normalizarTrechos, pedacos, TEXTO_MAX };
