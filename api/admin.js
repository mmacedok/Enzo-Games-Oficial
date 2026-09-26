// ============================================================================
// Painel do administrador (admin.html): ver e mexer nas contas por baixo do capô.
// Quem é admin: e-mails da conta Google listados em ADMIN_EMAILS (variável de
// ambiente, separados por vírgula). Para os outros, estas rotas não existem (404).
//
//   GET  /api/admin/overview                      números do site + últimas ações
//   GET  /api/admin/users?q=&pagina=              contas (com e-mail)
//   GET  /api/admin/users/:id                     tudo de uma conta
//   POST /api/admin/users/:id/achievement         { achievement, unlocked }
//   POST /api/admin/users/:id/role                { role: 'player' | 'banned' }
//   POST /api/admin/users/:id/fala                { fala }
//   POST /api/admin/users/:id/kick                derruba as sessões
//   GET  /api/admin/scores?game=                  partidas recentes de todo mundo
//   POST /api/admin/scores/:id/verify             { verified } (entra/sai do ranking)
//   POST /api/admin/scores/:id/delete
//   GET  /api/admin/log                           histórico das ações de admin
// Toda mudança fica registrada em admin_log.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const { jogoValido } = require('./anti-cheat.js');
const { limparFala } = require('./leitores.js');
const { exigirUuid } = require('./validacao.js');
const Conquistas = require('../js/conquistas.js');

const POR_PAGINA = 50;
const SEGMENTO = '([^/]{1,64})';

/** Conjunto de e-mails (minúsculos) de ADMIN_EMAILS. */
function lerAdmins(valor) {
    return new Set(String(valor || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));
}

const ehAdmin = (config, usuario) => Boolean(usuario?.email) && config.admins.has(String(usuario.email).toLowerCase());

async function exigirUsuario(ctx, id) {
    const [usuario] = await ctx.db.query('SELECT id, display_name, email, role FROM users WHERE id = $1', [exigirUuid(id, 'conta não encontrada')]);
    if (!usuario) throw new HttpError(404, 'conta não encontrada');
    return usuario;
}

async function registrar(ctx, acao, alvo, detalhe = null) {
    await ctx.db.query(
        'INSERT INTO admin_log (id, admin_id, acao, alvo, detalhe, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), ctx.usuario.id, acao, alvo, detalhe === null ? null : String(detalhe).slice(0, 200), ctx.agora()]);
}

async function ultimasAcoes(db, limite) {
    const linhas = await db.query(
        `SELECT l.acao, l.alvo, l.detalhe, l.created_at, a.display_name AS admin, u.display_name AS alvo_nome
           FROM admin_log l
           LEFT JOIN users a ON a.id = l.admin_id
           LEFT JOIN users u ON u.id = l.alvo
          ORDER BY l.created_at DESC, l.id LIMIT $1`, [limite]);
    return linhas.map((l) => ({
        acao: l.acao, alvo: l.alvo, alvoNome: l.alvo_nome || null, detalhe: l.detalhe,
        admin: l.admin || '?', em: Number(l.created_at),
    }));
}

const partida = (s) => ({
    id: s.id, gameId: s.game_id, score: Number(s.score), durationMs: Number(s.duration_ms),
    verified: Boolean(s.verified), metadata: s.client_metadata, em: Number(s.created_at),
});

const rotas = [
    {
        metodo: 'GET', caminho: '/api/admin/overview', admin: true,
        async executar(ctx) {
            const agora = ctx.agora();
            const [n] = await ctx.db.query(
                `SELECT (SELECT COUNT(*) FROM users) AS contas,
                        (SELECT COUNT(*) FROM users WHERE role = 'banned') AS banidos,
                        (SELECT COUNT(*) FROM users WHERE last_login_at > $1) AS ativos_7d,
                        (SELECT COUNT(*) FROM sessions WHERE expires_at > $2) AS sessoes,
                        (SELECT COUNT(*) FROM game_scores WHERE verified) AS partidas,
                        (SELECT COUNT(*) FROM game_scores WHERE NOT verified) AS partidas_fora,
                        (SELECT COUNT(*) FROM user_achievements) AS conquistas,
                        (SELECT COUNT(*) FROM reading_progress WHERE completed) AS capitulos_lidos`,
                [agora - 7 * 24 * 60 * 60 * 1000, agora]);
            const numeros = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Number(v)]));
            return { agora, numeros, log: await ultimasAcoes(ctx.db, 8) };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/users', admin: true,
        async executar(ctx) {
            const pagina = Math.max(0, Math.min(1000, Number.parseInt(ctx.url.searchParams.get('pagina'), 10) || 0));
            const busca = String(ctx.url.searchParams.get('q') || '').trim().slice(0, 80);
            const filtro = busca ? `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
            const linhas = await ctx.db.query(
                `SELECT u.id, u.display_name, u.email, u.role, u.avatar_url, u.fala, u.created_at, u.last_login_at,
                        COALESCE(a.conquistas, 0) AS conquistas, COALESCE(a.secretos, 0) AS secretos,
                        COALESCE(s.partidas, 0) AS partidas
                   FROM users u
                   LEFT JOIN (SELECT user_id,
                                     COUNT(*) FILTER (WHERE achievement_id NOT LIKE 'enzo-secreto-%') AS conquistas,
                                     COUNT(*) FILTER (WHERE achievement_id LIKE 'enzo-secreto-%') AS secretos
                                FROM user_achievements GROUP BY user_id) a ON a.user_id = u.id
                   LEFT JOIN (SELECT user_id, COUNT(*) AS partidas FROM game_scores GROUP BY user_id) s ON s.user_id = u.id
                  WHERE $1::text IS NULL OR u.display_name ILIKE $1 OR u.email ILIKE $1 OR u.id = $4
                  ORDER BY u.last_login_at DESC, u.id
                  LIMIT $2 OFFSET $3`,
                [filtro, POR_PAGINA + 1, pagina * POR_PAGINA, busca]);
            return {
                users: linhas.slice(0, POR_PAGINA).map((l) => ({
                    id: l.id, name: l.display_name, email: l.email, role: l.role, avatarUrl: l.avatar_url || null,
                    fala: l.fala || null, criadoEm: Number(l.created_at), ultimoLogin: Number(l.last_login_at),
                    conquistas: Number(l.conquistas), secretos: Number(l.secretos), partidas: Number(l.partidas),
                    admin: ehAdmin(ctx.config, l),
                })),
                pagina,
                maisPaginas: linhas.length > POR_PAGINA,
            };
        },
    },
    {
        metodo: 'GET', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}$`), admin: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'conta não encontrada');
            const [u] = await ctx.db.query('SELECT * FROM users WHERE id = $1', [id]);
            if (!u) throw new HttpError(404, 'conta não encontrada');
            const conquistas = await ctx.db.query(
                'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at', [id]);
            const partidas = await ctx.db.query(
                'SELECT * FROM game_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [id]);
            const leitura = await ctx.db.query(
                `SELECT comic_id, chapter_id, last_page, completed, updated_at FROM reading_progress
                  WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 300`, [id]);
            const [{ sessoes }] = await ctx.db.query(
                'SELECT COUNT(*) AS sessoes FROM sessions WHERE user_id = $1 AND expires_at > $2', [id, ctx.agora()]);
            // require aqui dentro: api/baralho.js também usa este arquivo.
            const baralho = await require('./baralho.js').estado(ctx.db, id);
            return {
                id: u.id, name: u.display_name, email: u.email, role: u.role, avatarUrl: u.avatar_url || null,
                fala: u.fala || null, criadoEm: Number(u.created_at), ultimoLogin: Number(u.last_login_at),
                admin: ehAdmin(ctx.config, u), sessoes: Number(sessoes),
                achievements: conquistas.map((c) => ({ id: c.achievement_id, em: Number(c.unlocked_at) })),
                scores: partidas.map(partida),
                baralho,
                reading: leitura.map((p) => ({
                    comicId: p.comic_id, chapterId: p.chapter_id, page: Number(p.last_page),
                    completed: Boolean(p.completed), em: Number(p.updated_at),
                })),
            };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/achievement$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const { achievement, unlocked } = await ctx.corpo();
            if (!Conquistas.idValido(achievement)) throw new HttpError(400, 'conquista desconhecida');
            if (typeof unlocked !== 'boolean') throw new HttpError(400, 'unlocked deve ser true ou false');
            const linhas = unlocked
                ? await ctx.db.query(
                    `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3)
                     ON CONFLICT (user_id, achievement_id) DO NOTHING RETURNING achievement_id`,
                    [alvo.id, achievement, ctx.agora()])
                : await ctx.db.query(
                    'DELETE FROM user_achievements WHERE user_id = $1 AND achievement_id = $2 RETURNING achievement_id',
                    [alvo.id, achievement]);
            if (linhas.length) await registrar(ctx, unlocked ? 'grant' : 'revoke', alvo.id, achievement);
            return { achievement, unlocked, changed: linhas.length > 0 };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/role$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const { role } = await ctx.corpo();
            if (role !== 'player' && role !== 'banned') throw new HttpError(400, "role deve ser 'player' ou 'banned'");
            if (alvo.id === ctx.usuario.id) throw new HttpError(400, 'você não pode banir a própria conta');
            if (role === 'banned' && ehAdmin(ctx.config, alvo)) throw new HttpError(400, 'não dá para banir outro admin');
            await ctx.db.query('UPDATE users SET role = $2 WHERE id = $1', [alvo.id, role]);
            if (role === 'banned') await ctx.db.query('DELETE FROM sessions WHERE user_id = $1', [alvo.id]);
            if (alvo.role !== role) await registrar(ctx, role === 'banned' ? 'ban' : 'unban', alvo.id);
            return { role };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/fala$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const fala = limparFala((await ctx.corpo()).fala);
            await ctx.db.query('UPDATE users SET fala = $2 WHERE id = $1', [alvo.id, fala]);
            await registrar(ctx, 'fala', alvo.id, fala ?? '(fala do Enzo)');
            return { fala };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/kick$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            if (alvo.id === ctx.usuario.id) throw new HttpError(400, 'use "Sair da conta" para derrubar a sua sessão');
            const linhas = await ctx.db.query('DELETE FROM sessions WHERE user_id = $1 RETURNING id', [alvo.id]);
            await registrar(ctx, 'kick', alvo.id, `${linhas.length} sessão(ões)`);
            return { sessoes: linhas.length };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/scores', admin: true,
        async executar(ctx) {
            const jogo = ctx.url.searchParams.get('game') || null;
            if (jogo && !jogoValido(jogo)) throw new HttpError(400, 'jogo desconhecido');
            const linhas = await ctx.db.query(
                `SELECT s.*, u.display_name FROM game_scores s JOIN users u ON u.id = s.user_id
                  WHERE $1::text IS NULL OR s.game_id = $1
                  ORDER BY s.created_at DESC LIMIT 100`, [jogo]);
            return { scores: linhas.map((s) => ({ ...partida(s), userId: s.user_id, name: s.display_name })) };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/scores/${SEGMENTO}/verify$`), admin: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'partida não encontrada');
            const { verified } = await ctx.corpo();
            if (typeof verified !== 'boolean') throw new HttpError(400, 'verified deve ser true ou false');
            const [s] = await ctx.db.query(
                'UPDATE game_scores SET verified = $2 WHERE id = $1 RETURNING user_id, game_id, score', [id, verified]);
            if (!s) throw new HttpError(404, 'partida não encontrada');
            await registrar(ctx, verified ? 'score-on' : 'score-off', s.user_id, `${s.game_id} ${s.score}`);
            return { id, verified };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/scores/${SEGMENTO}/delete$`), admin: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'partida não encontrada');
            const [s] = await ctx.db.query(
                'DELETE FROM game_scores WHERE id = $1 RETURNING user_id, game_id, score', [id]);
            if (!s) throw new HttpError(404, 'partida não encontrada');
            await registrar(ctx, 'rm-score', s.user_id, `${s.game_id} ${s.score}`);
            return { id, deleted: true };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/log', admin: true,
        executar: async (ctx) => ({ log: await ultimasAcoes(ctx.db, 100) }),
    },
];

module.exports = { rotas, lerAdmins, ehAdmin, exigirUsuario, registrar };
