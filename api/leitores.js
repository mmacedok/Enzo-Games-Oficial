// ============================================================================
// Leitores do site: perfis públicos e a fala do balão da Ficha do Leitor.
//   GET  /api/readers          lista de leitores (página ?pagina=N, 60 por vez)
//   GET  /api/readers/:id      perfil público: fala, conquistas e recordes
//   POST /api/user/profile     { fala } — o dono muda a própria fala
// Público = nome abreviado ("Henrique M."), foto do Google e nada de e-mail.
// Recordes públicos são só os verificados (os do ranking).
// ============================================================================
const { HttpError } = require('./http.js');
const { nomePublico } = require('./auth.js');

const POR_PAGINA = 60;
const FALA_MAX = 80;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Invisíveis e de controle (inclui os que invertem a direção do texto).
const CONTROLE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g;
const LINK = /(https?:|www\.|\.(com|net|org|br|io|gg|xyz|me)\b)/i;

/** Fala limpa (uma linha, até 80 letras, sem links) ou null para voltar à fala do Enzo. */
function limparFala(texto) {
    if (texto === null || texto === undefined) return null;
    if (typeof texto !== 'string') throw new HttpError(400, 'fala inválida');
    const limpa = texto.normalize('NFC').replace(CONTROLE, ' ').replace(/\s+/g, ' ').trim();
    if ([...limpa].length > FALA_MAX) throw new HttpError(400, `a fala tem no máximo ${FALA_MAX} letras`);
    if (LINK.test(limpa)) throw new HttpError(400, 'sem links na fala');
    return limpa || null;
}

// Número de leitor: ordem de chegada ao site (o 1º a entrar é o Nº 1).
const NUMERO = `(SELECT COUNT(*) FROM users x WHERE x.created_at < u.created_at
                 OR (x.created_at = u.created_at AND x.id <= u.id))`;

function exigirUuid(id) {
    if (!UUID.test(id)) throw new HttpError(404, 'leitor não encontrado');
    return id;
}

const rotas = [
    {
        metodo: 'GET', caminho: '/api/readers',
        async executar(ctx) {
            const pagina = Math.max(0, Math.min(1000, Number.parseInt(ctx.url.searchParams.get('pagina'), 10) || 0));
            const linhas = await ctx.db.query(
                `SELECT u.id, u.display_name, u.fala, u.avatar_url, ${NUMERO} AS numero,
                        (SELECT COUNT(*) FROM user_achievements a
                          WHERE a.user_id = u.id AND a.achievement_id NOT LIKE 'enzo-secreto-%') AS conquistas,
                        (SELECT COUNT(*) FROM user_achievements a
                          WHERE a.user_id = u.id AND a.achievement_id LIKE 'enzo-secreto-%') AS secretos
                   FROM users u
                  WHERE u.role <> 'banned'
                  ORDER BY u.last_login_at DESC, u.id
                  LIMIT $1 OFFSET $2`,
                [POR_PAGINA + 1, pagina * POR_PAGINA]);
            return {
                readers: linhas.slice(0, POR_PAGINA).map((l) => ({
                    id: l.id,
                    name: nomePublico(l.display_name),
                    fala: l.fala || null,
                    avatarUrl: l.avatar_url || null,
                    numero: Number(l.numero),
                    conquistas: Number(l.conquistas),
                    secretos: Number(l.secretos),
                    isMe: l.id === ctx.usuario?.id,
                })),
                pagina,
                maisPaginas: linhas.length > POR_PAGINA,
            };
        },
    },
    {
        metodo: 'GET', caminho: /^\/api\/readers\/([^/]{1,64})$/,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0]);
            const [leitor] = await ctx.db.query(
                `SELECT u.id, u.display_name, u.fala, u.avatar_url, u.created_at, ${NUMERO} AS numero
                   FROM users u WHERE u.id = $1 AND u.role <> 'banned'`, [id]);
            if (!leitor) throw new HttpError(404, 'leitor não encontrado');
            const conquistas = await ctx.db.query(
                'SELECT achievement_id FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at', [id]);
            const recordes = await ctx.db.query(
                `SELECT game_id, MAX(score) AS melhor FROM game_scores
                  WHERE user_id = $1 AND verified GROUP BY game_id`, [id]);
            return {
                id: leitor.id,
                name: nomePublico(leitor.display_name),
                fala: leitor.fala || null,
                avatarUrl: leitor.avatar_url || null,
                numero: Number(leitor.numero),
                desde: Number(leitor.created_at),
                achievements: conquistas.map((c) => c.achievement_id),
                records: Object.fromEntries(recordes.map((r) => [r.game_id, Number(r.melhor)])),
                isMe: leitor.id === ctx.usuario?.id,
            };
        },
    },
    {
        metodo: 'POST', caminho: '/api/user/profile', login: true,
        async executar(ctx) {
            const fala = limparFala((await ctx.corpo()).fala);
            await ctx.db.query('UPDATE users SET fala = $2 WHERE id = $1', [ctx.usuario.id, fala]);
            return { fala };
        },
    },
];

module.exports = { rotas, limparFala, FALA_MAX };
