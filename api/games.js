// ============================================================================
// Recordes e ranking dos jogos.
//   start  -> cria um run_token (relógio do servidor começa a contar)
//   submit -> consome o token (uso único), passa no anti-cheat e grava
//   leaderboard -> Top 50 (melhor pontuação de cada jogador) + a posição de quem pede
// Só partidas com login vão para o ranking; convidado joga só com recorde local.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const { jogoValido, validarPontuacao } = require('./anti-cheat.js');
const { nomePublico } = require('./auth.js');

const HORA = 60 * 60 * 1000;
const VALIDADE_PARTIDA = 3 * HORA;
const PARTIDAS_ABERTAS_POR_USUARIO = 10;
const TOPO = 50;

function exigirJogo(gameId) {
    if (!jogoValido(gameId)) throw new HttpError(400, 'jogo desconhecido');
    return gameId;
}

/** Ranking: a melhor partida verificada de cada jogador; empate = quem chegou antes. */
async function ranking(db, gameId, usuarioId = null) {
    const linhas = await db.query(
        `WITH melhor AS (
             SELECT DISTINCT ON (s.user_id) s.user_id, s.score, s.created_at
               FROM game_scores s JOIN users u ON u.id = s.user_id
              WHERE s.game_id = $1 AND s.verified AND u.role <> 'banned'
              ORDER BY s.user_id, s.score DESC, s.created_at ASC
         ), posicoes AS (
             SELECT m.user_id, m.score, u.display_name,
                    ROW_NUMBER() OVER (ORDER BY m.score DESC, m.created_at ASC) AS posicao
               FROM melhor m JOIN users u ON u.id = m.user_id
         )
         SELECT * FROM posicoes WHERE posicao <= $2 OR user_id = $3 ORDER BY posicao`,
        [gameId, TOPO, usuarioId]);
    const linha = (l) => ({ id: l.user_id, position: Number(l.posicao), name: nomePublico(l.display_name), score: Number(l.score), isMe: l.user_id === usuarioId });
    const eu = linhas.find((l) => l.user_id === usuarioId);
    return {
        gameId,
        top: linhas.filter((l) => Number(l.posicao) <= TOPO).map(linha),
        me: eu ? linha(eu) : null,
    };
}

/** Metadados livres do jogo (talheres, metros, tiros): só objeto pequeno. */
function metadadosSeguros(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const texto = JSON.stringify(metadata);
    return texto.length <= 512 ? texto : null;
}

const rotas = [
    {
        metodo: 'POST', caminho: '/api/games/session/start', login: true,
        async executar(ctx) {
            const gameId = exigirJogo((await ctx.corpo()).gameId);
            const agora = ctx.agora();
            await ctx.db.query('DELETE FROM game_runs WHERE expires_at <= $1', [agora]);
            // Cada usuário mantém só as últimas partidas abertas (abas esquecidas não acumulam).
            await ctx.db.query(
                `DELETE FROM game_runs WHERE user_id = $1 AND run_token NOT IN (
                     SELECT run_token FROM game_runs WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2)`,
                [ctx.usuario.id, PARTIDAS_ABERTAS_POR_USUARIO - 1]);
            const runToken = crypto.randomBytes(24).toString('base64url');
            await ctx.db.query(
                'INSERT INTO game_runs (run_token, user_id, game_id, started_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
                [runToken, ctx.usuario.id, gameId, agora, agora + VALIDADE_PARTIDA]);
            return { runToken };
        },
    },
    {
        metodo: 'POST', caminho: '/api/games/session/submit', login: true,
        async executar(ctx) {
            const { runToken, score, metadata } = await ctx.corpo();
            if (typeof runToken !== 'string' || runToken.length > 64) throw new HttpError(400, 'runToken ausente');
            // Uso único: apaga e devolve na mesma operação (dois envios não passam).
            const [partida] = await ctx.db.query(
                'DELETE FROM game_runs WHERE run_token = $1 AND user_id = $2 RETURNING game_id, started_at, expires_at',
                [runToken, ctx.usuario.id]);
            if (!partida) throw new HttpError(409, 'partida desconhecida ou já enviada');
            const agora = ctx.agora();
            if (Number(partida.expires_at) <= agora) throw new HttpError(410, 'partida expirada');

            const gameId = partida.game_id;
            const duracao = agora - Number(partida.started_at);
            const validacao = validarPontuacao(gameId, score, duracao);
            if (!validacao.ok) throw new HttpError(422, validacao.motivo, { accepted: false });

            const [{ melhor }] = await ctx.db.query(
                'SELECT MAX(score) AS melhor FROM game_scores WHERE user_id = $1 AND game_id = $2 AND verified',
                [ctx.usuario.id, gameId]);
            const anterior = melhor === null ? 0 : Number(melhor);
            if (score > 0) {
                await ctx.db.query(
                    `INSERT INTO game_scores (id, user_id, game_id, score, duration_ms, verified, client_metadata, created_at)
                     VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7)`,
                    [crypto.randomUUID(), ctx.usuario.id, gameId, score, duracao, metadadosSeguros(metadata), agora]);
            }
            const { me } = await ranking(ctx.db, gameId, ctx.usuario.id);
            return { accepted: true, score, best: Math.max(anterior, score), newRecord: score > anterior, position: me?.position ?? null };
        },
    },
    {
        metodo: 'GET', caminho: /^\/api\/games\/leaderboard\/([a-z0-9-]{1,40})$/,
        executar: (ctx) => ranking(ctx.db, exigirJogo(ctx.params[0]), ctx.usuario?.id ?? null),
    },
];

module.exports = { rotas, ranking };
