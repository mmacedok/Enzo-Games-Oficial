// ============================================================================
// Progresso do leitor, conquistas e migração do convidado (localStorage -> conta).
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const { jogoValido, PONTOS_MAX } = require('./anti-cheat.js');
const { usuarioPublico } = require('./auth.js');

/** Conquistas que o navegador pode registrar. */
const CONQUISTAS = Object.freeze(['macarronada', 'cabo-coco']);
const ID = /^[a-z0-9-]{1,64}$/;
const MAX_PROGRESSOS = 300;

const idValido = (valor) => typeof valor === 'string' && ID.test(valor);

function exigirId(valor, campo) {
    if (!idValido(valor)) throw new HttpError(400, `${campo} inválido`);
    return valor;
}

/** Tudo que o site precisa da conta: conquistas, recordes e onde parou de ler. */
async function estadoDoUsuario(ctx) {
    const id = ctx.usuario.id;
    const conquistas = await ctx.db.query(
        'SELECT achievement_id FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at', [id]);
    const recordes = await ctx.db.query(
        `SELECT game_id, MAX(score) AS melhor, MAX(score) FILTER (WHERE verified) AS melhor_verificado
           FROM game_scores WHERE user_id = $1 GROUP BY game_id`, [id]);
    const progresso = await ctx.db.query(
        `SELECT comic_id, chapter_id, last_page, zoom_level, completed, updated_at
           FROM reading_progress WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50`, [id]);
    const leitura = progresso.map((p) => ({
        comicId: p.comic_id, chapterId: p.chapter_id, page: Number(p.last_page),
        zoom: Number(p.zoom_level), completed: Boolean(p.completed), updatedAt: Number(p.updated_at),
    }));
    return {
        user: usuarioPublico(ctx.usuario),
        achievements: conquistas.map((c) => c.achievement_id),
        records: Object.fromEntries(recordes.map((r) => [r.game_id, {
            best: Number(r.melhor),
            verifiedBest: r.melhor_verificado === null ? 0 : Number(r.melhor_verificado),
        }])),
        progress: leitura,
        lastRead: leitura[0] || null,
    };
}

async function gravarConquista(ctx, conquista) {
    await ctx.db.query(
        `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, achievement_id) DO NOTHING`, [ctx.usuario.id, conquista, ctx.agora()]);
}

const rotas = [
    {
        metodo: 'GET', caminho: '/api/user/sync', login: true,
        executar: estadoDoUsuario,
    },
    {
        // Convidado que faz login: recordes locais viram "recorde pessoal" (verified = false,
        // fora do ranking — não dá para provar que foram jogados), conquistas locais entram
        // na conta e o último gibi lido vira progresso se a conta ainda não tiver nenhum.
        metodo: 'POST', caminho: '/api/user/sync-guest', login: true,
        async executar(ctx) {
            const { records, achievements, lastRead } = await ctx.corpo();
            const id = ctx.usuario.id;
            const agora = ctx.agora();
            if (records && typeof records === 'object') {
                for (const [gameId, valor] of Object.entries(records)) {
                    if (!jogoValido(gameId) || !Number.isSafeInteger(valor) || valor <= 0 || valor > PONTOS_MAX) continue;
                    const [{ melhor }] = await ctx.db.query(
                        'SELECT MAX(score) AS melhor FROM game_scores WHERE user_id = $1 AND game_id = $2', [id, gameId]);
                    if (melhor !== null && Number(melhor) >= valor) continue;
                    await ctx.db.query(
                        `INSERT INTO game_scores (id, user_id, game_id, score, duration_ms, verified, client_metadata, created_at)
                         VALUES ($1, $2, $3, $4, 0, FALSE, $5, $6)`,
                        [crypto.randomUUID(), id, gameId, valor, JSON.stringify({ origem: 'convidado' }), agora]);
                }
            }
            if (Array.isArray(achievements)) {
                for (const conquista of achievements.slice(0, 20)) {
                    if (CONQUISTAS.includes(conquista)) await gravarConquista(ctx, conquista);
                }
            }
            if (lastRead && idValido(lastRead.comicId) && idValido(lastRead.chapterId)) {
                const [{ total }] = await ctx.db.query('SELECT COUNT(*) AS total FROM reading_progress WHERE user_id = $1', [id]);
                if (Number(total) === 0) {
                    await ctx.db.query(
                        `INSERT INTO reading_progress (user_id, comic_id, chapter_id, last_page, zoom_level, completed, updated_at)
                         VALUES ($1, $2, $3, 0, 1.0, FALSE, $4)`, [id, lastRead.comicId, lastRead.chapterId, agora]);
                }
            }
            return estadoDoUsuario(ctx);
        },
    },
    {
        metodo: 'POST', caminho: '/api/reader/progress', login: true,
        async executar(ctx) {
            const corpo = await ctx.corpo();
            const comicId = exigirId(corpo.comicId, 'comicId');
            const chapterId = exigirId(corpo.chapterId, 'chapterId');
            const page = corpo.page ?? 0;
            const zoom = corpo.zoom ?? 1;
            if (!Number.isSafeInteger(page) || page < 0 || page > 10_000) throw new HttpError(400, 'page inválida');
            if (typeof zoom !== 'number' || !(zoom >= 0.5 && zoom <= 3)) throw new HttpError(400, 'zoom inválido');
            const id = ctx.usuario.id;
            const [{ total, existe }] = await ctx.db.query(
                `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE comic_id = $2 AND chapter_id = $3) AS existe
                   FROM reading_progress WHERE user_id = $1`, [id, comicId, chapterId]);
            if (Number(existe) === 0 && Number(total) >= MAX_PROGRESSOS) throw new HttpError(400, 'progresso demais salvo');
            await ctx.db.query(
                `INSERT INTO reading_progress (user_id, comic_id, chapter_id, last_page, zoom_level, completed, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (user_id, comic_id, chapter_id) DO UPDATE SET last_page = EXCLUDED.last_page,
                     zoom_level = EXCLUDED.zoom_level,
                     completed = reading_progress.completed OR EXCLUDED.completed,
                     updated_at = EXCLUDED.updated_at`,
                [id, comicId, chapterId, page, zoom, corpo.completed === true, ctx.agora()]);
            return { saved: true };
        },
    },
    {
        metodo: 'POST', caminho: '/api/user/achievement', login: true,
        async executar(ctx) {
            const { id } = await ctx.corpo();
            if (!CONQUISTAS.includes(id)) throw new HttpError(400, 'conquista desconhecida');
            await gravarConquista(ctx, id);
            const conquistas = await ctx.db.query(
                'SELECT achievement_id FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at', [ctx.usuario.id]);
            return { achievements: conquistas.map((c) => c.achievement_id) };
        },
    },
];

module.exports = { rotas, CONQUISTAS, estadoDoUsuario };
